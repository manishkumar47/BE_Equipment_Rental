import * as authRepository from "./auth.repository.js";
import crypto from "crypto";
import jwt from 'jsonwebtoken'
import { UserTokenProp } from "../Users/user.type.js";
import { logger } from "../../lib/pinoLogger.js";

export const findUserByEmailAndPassword = async (
  email: string,
  password: string,
) => {
  const user = await authRepository.findUserByEmailAndPassword(email, password);

  return user;
};

export const createUserToken = async ({ userTokenPayload }: UserTokenProp) => {
  try {
    return jwt.sign(userTokenPayload, process.env.JWT_SECRET || "secret");
  } catch (error) {
    return null;
  }
};

export const findUserByEmail = async (email: string) => {
  try {
    const user = await authRepository.findUserByEmail(email);
    return user;
  } catch (error) {
    return null;
  }
};

export const createPasswordResetToken = async (email: string) => {
  try {
    const user = await authRepository.findUserByEmail(email);
    if (!user) return null;

    const token = crypto.randomBytes(32).toString("hex");
    const expiresMinutes =
      Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES) || 60;
    const expiryAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    await authRepository.createPasswordReset(user.id, token, expiryAt);
    return token;
  } catch (error) {
    return null;
  }
};

export const verifyPasswordResetToken = async (token: string) => {
  try {
    const record = await authRepository.findPasswordResetByToken(token);
    // logger.debug(`Tooken in servive ${token}`)
    if (!record) return null;
    // console.log("-----record founded",record)
    return { id: record.id, userId: record.user_id, email: record.User.email };
  } catch (error) {
    return null;
  }
};

export const markPasswordResetUsed = async (id: number) => {
  return authRepository.markPasswordResetUsed(id);
};

export const updateUserPassword = async (email: string, password: string) => {
  return authRepository.updateUserPassword(email, password);
};
