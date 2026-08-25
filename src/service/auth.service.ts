import * as authRepository from "../database/repository/auth.repository.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { AppError } from "../util/appError.js";
import type { UserTokenProp } from "../types/user.type.js";
import { env } from "../config/env.js";
import { sendResetPassword } from "../util/emails/resetPasswordEmail.js";
import { logger } from "../core/pinoLogger.js";

export const findUserByEmailAndPassword = async (
  email: string,
  password: string,
) => {
  return authRepository.findUserByEmailAndPassword(email, password);
};

export const createUserToken = async ({ userTokenPayload }: UserTokenProp) => {
  try {
    return jwt.sign(userTokenPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
  } catch (error) {
    throw new AppError(500, "Failed to generate token");
  }
};

export const findUserByEmail = async (email: string) => {
  try {
    return await authRepository.findUserByEmail(email);
  } catch (error) {
    throw new AppError(404, "User not found");
  }
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  try {
    const user = await authRepository.findUserByEmailSafe(email);
    if (!user) {
      // Return early without error to prevent user enumeration
      return;
    }

    // Invalidate any previous unused reset tokens for this user
    await authRepository.invalidateUserResetTokens(user.id);

    // Create a new password reset record (15 minutes expiry)
    const expiryAt = new Date(Date.now() + 15 * 60 * 1000);
    const resetRecord = await authRepository.createPasswordResetRecord(
      user.id,
      expiryAt,
    );

    if (!resetRecord) {
      logger.error(`Failed to create reset token record for ${email}`);
      return;
    }

    // Sign the reset token JWT containing the DB row id and user email (15 min expiry)
    const token = jwt.sign(
      { id: resetRecord.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    // Send the email with the reset link
    const sent = await sendResetPassword({
      user: { name: user.name, email: user.email },
      token,
    });

    if (!sent) {
      logger.error(`Reset email failed to dispatch for ${email}`);
    }
  } catch (error) {
    logger.error({ err: error }, `Error during password reset request for ${email}`);
    // Do not bubble up error details to prevent user enumeration
  }
};

export const resetPassword = async (
  token: string,
  newPassword: string,
): Promise<void> => {
  // Defense-in-depth: Validate password length directly in service layer
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    throw new AppError(400, "New password must be at least 8 characters long!");
  }

  if (!token || typeof token !== "string") {
    throw new AppError(400, "Reset token is required");
  }

  // 1. Verify JWT signature and token expiry
  let payload: { id: number; email: string };
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as {
      id: number;
      email: string;
    };
  } catch (err) {
    throw new AppError(400, "Invalid or expired reset token");
  }

  if (!payload || !payload.id || !payload.email) {
    throw new AppError(400, "Invalid token payload");
  }

  // 2. Look up the user
  const user = await authRepository.findUserByEmailSafe(payload.email);
  if (!user) {
    throw new AppError(400, "Invalid reset token or user no longer exists");
  }

  // 3. Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 4. Atomically verify token row, update password, and mark token as used
  try {
    await authRepository.executeResetPasswordTransaction(
      user.id,
      payload.id,
      hashedPassword,
    );
  } catch (error: any) {
    throw new AppError(400, error.message || "Failed to reset password");
  }
};
