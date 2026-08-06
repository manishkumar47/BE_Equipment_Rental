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
