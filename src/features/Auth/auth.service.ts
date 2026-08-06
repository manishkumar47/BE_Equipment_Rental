import * as authRepository from "./auth.repository.js";
import jwt from "jsonwebtoken";

import { UserTokenProp } from "../Users/user.type.js";

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
  const user = await authRepository.findUserByEmail(email);
  return user;
};
