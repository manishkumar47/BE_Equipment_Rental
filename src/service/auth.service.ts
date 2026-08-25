import * as authRepository from "../database/repository/auth.repository.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { AppError } from "../util/appError.js";
import type { UserTokenProp } from "../types/user.type.js";
import { env } from "../config/env.js";
import { sendResetPassword } from "../util/emails/resetPasswordEmail.js";
import { sendSignupOtpEmail } from "../util/emails/otpEmail.js";
import { logger } from "../core/pinoLogger.js";

export const loginUser = async (email: string, password: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await authRepository.findUserByEmailSafe(normalizedEmail);

  if (!user || user.isDeleted) {
    throw new AppError(
      404,
      "No user found with this email. Please sign up first.",
    );
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(
      401,
      "Incorrect password. Please check your password and try again.",
    );
  }

  return user;
};

export const findUserByEmailAndPassword = loginUser;

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
  const user = await authRepository.findUserByEmailSafe(email.toLowerCase().trim());
  if (!user || user.isDeleted) {
    throw new AppError(404, "User not found");
  }
  return user;
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await authRepository.findUserByEmailSafe(normalizedEmail);
  if (!user || user.isDeleted) {
    throw new AppError(
      404,
      "No account found with this email. Please check your email or sign up.",
    );
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
    throw new AppError(500, "Failed to create reset token record.");
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
    logger.error(`Reset email failed to dispatch for ${normalizedEmail}`);
    throw new AppError(500, "Failed to send reset email. Please try again later.");
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

export const initiateSignup = async ({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if user already exists
  const existingUser = await authRepository.findUserByEmailSafe(normalizedEmail);
  if (existingUser) {
    throw new AppError(409, "User already exists with this email.");
  }

  // 2. Hash password upfront for storage in the pending payload
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Invalidate any previous unused OTPs for this email (allows clean retry/restart)
  await authRepository.invalidateUnusedOtpForEmail(normalizedEmail);

  // 4. Generate cryptographically secure 4-digit numeric OTP (1000-9999)
  const otp = crypto.randomInt(1000, 10000).toString();
  const otpHash = await bcrypt.hash(otp, 10);

  // 5. Set 10-minute expiry
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // 6. Create OTP record with pending user data in payload
  const createdRecord = await authRepository.createOtpVerificationRecord({
    email: normalizedEmail,
    otpHash,
    payload: {
      name: name.trim(),
      hashedPassword,
    },
    expiresAt,
  });

  if (!createdRecord) {
    throw new AppError(500, "Failed to initiate signup verification.");
  }

  // 7. Dispatch OTP email
  const emailSent = await sendSignupOtpEmail({
    user: { name: name.trim(), email: normalizedEmail },
    otp,
  });

  if (!emailSent) {
    logger.warn(`Failed to dispatch signup OTP email to ${normalizedEmail}`);
  }

  return { message: "Verification code sent to your email." };
};

export const resendSignupOtp = async (email: string) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Enforce 2-minute cooldown between OTP requests for the same email
  const lastOtp = await authRepository.findLatestOtpByEmail(normalizedEmail);
  if (lastOtp) {
    const timeSinceCreated = Date.now() - new Date(lastOtp.createdAt).getTime();
    const cooldownMs = 2 * 60 * 1000;
    if (timeSinceCreated < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - timeSinceCreated) / 1000);
      throw new AppError(
        429,
        `Please wait ${waitSeconds} seconds before requesting a new code.`,
      );
    }
  }

  // 2. Find the current pending unused OTP to retrieve the stored payload
  const currentUnusedOtp =
    await authRepository.findLatestUnusedOtpByEmail(normalizedEmail);

  if (!currentUnusedOtp || !currentUnusedOtp.payload) {
    throw new AppError(
      400,
      "No pending signup verification found. Please sign up again.",
    );
  }

  const payload = currentUnusedOtp.payload as {
    name: string;
    hashedPassword: string;
  };

  if (!payload.name || !payload.hashedPassword) {
    throw new AppError(
      400,
      "Pending registration data is corrupted. Please sign up again.",
    );
  }

  // 3. Invalidate old unused OTP row(s)
  await authRepository.invalidateUnusedOtpForEmail(normalizedEmail);

  // 4. Generate new 4-digit OTP and hash it
  const otp = crypto.randomInt(1000, 10000).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // 5. Create new OTP record reusing payload
  const newOtpRecord = await authRepository.createOtpVerificationRecord({
    email: normalizedEmail,
    otpHash,
    payload,
    expiresAt,
  });

  if (!newOtpRecord) {
    throw new AppError(500, "Failed to create a new verification code.");
  }

  // 6. Send email
  const emailSent = await sendSignupOtpEmail({
    user: { name: payload.name, email: normalizedEmail },
    otp,
  });

  if (!emailSent) {
    logger.warn(`Failed to dispatch resend OTP email to ${normalizedEmail}`);
  }

  return { message: "A new verification code has been sent." };
};

export const verifySignupOtp = async ({
  email,
  otp,
}: {
  email: string;
  otp: string;
}) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Fetch latest unused OTP record
  const otpRecord =
    await authRepository.findLatestUnusedOtpByEmail(normalizedEmail);

  // 2. Unified guard clauses
  if (!otpRecord || otpRecord.used) {
    throw new AppError(
      400,
      "Invalid or expired verification session. Please sign up again.",
    );
  }

  if (new Date(otpRecord.expiresAt).getTime() < Date.now()) {
    throw new AppError(
      400,
      "Verification code has expired. Please request a new code.",
    );
  }

  if (otpRecord.attempts >= 5) {
    throw new AppError(
      400,
      "Too many failed attempts. Please request a new verification code.",
    );
  }

  // 3. Compare OTP hash
  const isValidOtp = await bcrypt.compare(otp.trim(), otpRecord.otpHash);

  if (!isValidOtp) {
    // Increment failed attempts count
    await authRepository.incrementOtpAttempts(otpRecord.id);
    throw new AppError(400, "Invalid verification code.");
  }

  // 4. Extract pending payload
  const payload = otpRecord.payload as {
    name: string;
    hashedPassword: string;
  };

  if (!payload || !payload.name || !payload.hashedPassword) {
    throw new AppError(
      400,
      "Pending registration data is invalid. Please sign up again.",
    );
  }

  // 5. In a single atomic transaction: create user and mark OTP row used
  let createdUser;
  try {
    createdUser = await authRepository.executeVerifyAndCreateUserTransaction({
      otpId: otpRecord.id,
      name: payload.name,
      email: normalizedEmail,
      hashedPassword: payload.hashedPassword,
    });
  } catch (err: any) {
    if (err.code === "23505" || err.message?.includes("unique")) {
      throw new AppError(409, "User already exists with this email.");
    }
    throw new AppError(500, err.message || "Failed to complete user registration.");
  }

  if (!createdUser) {
    throw new AppError(500, "Failed to complete user registration.");
  }

  // 6. Generate auth JWT token
  const token = await createUserToken({
    userTokenPayload: {
      id: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
    },
  });

  return {
    id: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
    role: createdUser.role,
    token,
  };
};


