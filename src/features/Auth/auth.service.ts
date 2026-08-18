import * as authRepository from "./auth.repository.js";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { AppError } from "../../utils/appError.js";
import type { UserTokenProp } from "../Users/user.type.js";
import { env } from "../../config/env.js";

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

export const createPasswordResetToken = async (email: string) => {
  try {
    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new AppError(404, "User not found");

    const rawToken = crypto.randomBytes(32).toString("hex");
    const expiresMinutes = env.PASSWORD_RESET_EXPIRES_MINUTES;
    const expiryAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    await authRepository.createPasswordReset(user.id, rawToken, expiryAt);
    return rawToken;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      500,
      (error as Error).message || "Internal Server Error",
    );
  }
};

export const verifyPasswordResetToken = async (token: string) => {
  try {
    const record = await authRepository.findPasswordResetByToken(token);
    if (!record) throw new AppError(400, "Invalid or expired token");
    return {
      id: record.id,
      userId: record.userId,
      email: record.user?.email ?? "",
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      500,
      (error as Error).message || "Internal Server Error",
    );
  }
};

export const markPasswordResetUsed = async (id: number) => {
  return authRepository.markPasswordResetUsed(id);
};

export const updateUserPassword = async (email: string, password: string) => {
  return authRepository.updateUserPassword(email, password);
};
