import prismaClient from "../../lib/prisma.js";
import bcrypt from "bcrypt";
export const findUserByEmailAndPassword = async (
  email: string,
  password: string,
) => {
  const userexist = await prismaClient.user.findUnique({
    where: { email },
  });
  if (!userexist) {
    throw new Error("User not found!");
  }
  const isPasswordValid = await bcrypt.compare(password, userexist.password);
  if (!isPasswordValid) {
    throw new Error("Invalid password!");
  }
  return userexist;
};

export const findUserByEmail = async (email: string) => {
  const userexist = await prismaClient.user.findUnique({
    where: { email },
  });
  if (!userexist) {
    throw new Error("User not found!");
  }
  return userexist;
};

export const updateUserPassword = async (email: string, password: string) => {
  return prismaClient.user.update({
    where: { email },
    data: { password },
    select: { id: true, email: true, name: true },
  });
};

export const createPasswordReset = async (
  userId: number,
  token: string,
  expiryAt: Date,
) => {
  return prismaClient.passwordReset.create({
    data: { token, expiryAt, user_id: userId },
  });
};

export const findPasswordResetByToken = async (token: string) => {
  return prismaClient.passwordReset.findFirst({
    where: {
      token,
      used: false,
      expiryAt: {
        gt: new Date(),
      },
    },
    include: { User: true },
  });
};

export const markPasswordResetUsed = async (id: number) => {
  return prismaClient.passwordReset.update({
    where: { id },
    data: { used: true },
  });
};
