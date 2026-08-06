import prismaClient from "../../lib/prisma.js";
import { CreateUserType } from "./user.type.js";

export const createUser = async (user: CreateUserType) => {
  const createdUser = await prismaClient.user.create({
    data: user,
  });
  return createdUser;
};

export const getAllUsers = async () => {
  return prismaClient.user.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
};

export const softDeleteUser = async (userId: number) => {
  return prismaClient.user.update({
    where: { id: userId },
    data: { isDeleted: true, deletedAt: new Date() },
  });
};
