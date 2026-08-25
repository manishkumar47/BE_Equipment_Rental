import db from "../../database/db-connection.js";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { and, eq, desc, sql } from "drizzle-orm";
import { user, passwordReset, otpVerification } from "../../database/schema/schema.js";

export const findUserByEmail = async (email: string) => {
  return db.query.user.findFirst({
    where: { email },
  });
};

export const findUserByEmailSafe = async (email: string) => {
  return db.query.user.findFirst({
    where: { email },
  });
};

export const invalidateUserResetTokens = async (userId: number) => {
  return db
    .update(passwordReset)
    .set({ used: true })
    .where(
      and(
        eq(passwordReset.userId, userId),
        eq(passwordReset.used, false),
      ),
    );
};

export const createPasswordResetRecord = async (
  userId: number,
  expiryAt: Date,
) => {
  // NOTE: The `token` column value here is a random hex placeholder solely to satisfy the non-null DB constraint.
  // It is NOT used for credential lookup or auth validation (which relies entirely on the signed JWT + row id).
  const placeholderToken = crypto.randomBytes(32).toString("hex");
  const [created] = await db
    .insert(passwordReset)
    .values({
      userId,
      expiryAt,
      used: false,
      token: placeholderToken,
    })
    .returning({ id: passwordReset.id });
  return created;
};

export const executeResetPasswordTransaction = async (
  userId: number,
  resetTokenId: number,
  hashedPassword: string,
) => {
  return db.transaction(async (tx) => {
    // 1. Fetch the password reset record
    const [tokenRecord] = await tx
      .select()
      .from(passwordReset)
      .where(eq(passwordReset.id, resetTokenId));

    if (!tokenRecord) {
      throw new Error("Invalid reset token");
    }

    if (tokenRecord.used) {
      throw new Error("This reset link has already been used");
    }

    if (new Date(tokenRecord.expiryAt).getTime() < Date.now()) {
      throw new Error("This reset link has expired");
    }

    if (tokenRecord.userId !== userId) {
      throw new Error("Token does not match the user");
    }

    // 2. Atomically update the user password
    const [updatedUser] = await tx
      .update(user)
      .set({ password: hashedPassword })
      .where(eq(user.id, userId))
      .returning({ id: user.id, email: user.email, name: user.name });

    // 3. Mark the password reset token as used
    await tx
      .update(passwordReset)
      .set({ used: true })
      .where(eq(passwordReset.id, resetTokenId));

    // NOTE: If a database-backed session or refresh token system is added in the future,
    // session invalidation queries should be executed here within this same atomic transaction.

    return updatedUser;
  });
};

export const updateUserPassword = async (email: string, password: string) => {
  const [updated] = await db
    .update(user)
    .set({ password })
    .where(eq(user.email, email))
    .returning({ id: user.id, email: user.email, name: user.name });
  return updated;
};

export const invalidateUnusedOtpForEmail = async (email: string) => {
  return db
    .update(otpVerification)
    .set({ used: true })
    .where(
      and(
        eq(otpVerification.email, email),
        eq(otpVerification.used, false),
      ),
    );
};

export const createOtpVerificationRecord = async ({
  email,
  otpHash,
  payload,
  expiresAt,
}: {
  email: string;
  otpHash: string;
  payload: Record<string, any>;
  expiresAt: Date;
}) => {
  const [created] = await db
    .insert(otpVerification)
    .values({
      email,
      otpHash,
      payload,
      expiresAt,
      used: false,
      attempts: 0,
    })
    .returning();
  return created;
};

export const findLatestUnusedOtpByEmail = async (email: string) => {
  const [record] = await db
    .select()
    .from(otpVerification)
    .where(
      and(
        eq(otpVerification.email, email),
        eq(otpVerification.used, false),
      ),
    )
    .orderBy(desc(otpVerification.createdAt))
    .limit(1);
  return record || null;
};

export const findLatestOtpByEmail = async (email: string) => {
  const [record] = await db
    .select()
    .from(otpVerification)
    .where(eq(otpVerification.email, email))
    .orderBy(desc(otpVerification.createdAt))
    .limit(1);
  return record || null;
};

export const incrementOtpAttempts = async (otpId: number) => {
  return db
    .update(otpVerification)
    .set({
      attempts: sql`${otpVerification.attempts} + 1`,
    })
    .where(eq(otpVerification.id, otpId));
};

export const executeVerifyAndCreateUserTransaction = async ({
  otpId,
  name,
  email,
  hashedPassword,
}: {
  otpId: number;
  name: string;
  email: string;
  hashedPassword: string;
}) => {
  return db.transaction(async (tx) => {
    // 1. Create the user
    const [createdUser] = await tx
      .insert(user)
      .values({
        name,
        email,
        password: hashedPassword,
        role: "USER",
      })
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });

    if (!createdUser) {
      throw new Error("Failed to create user account.");
    }

    // 2. Mark OTP verification as used
    await tx
      .update(otpVerification)
      .set({ used: true })
      .where(eq(otpVerification.id, otpId));

    return createdUser;
  });
};


