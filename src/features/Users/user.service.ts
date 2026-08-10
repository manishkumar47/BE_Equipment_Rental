import { Prisma } from "@prisma/client";
import * as userRepository from "./user.repository.js";
import { CreateUserType } from "./user.type.js";
import { hashpassword } from "../../helpers/bcrypt.helper.js";

export const createUser = async (data: CreateUserType) => {
  try {
    const existingUser = await userRepository.findUserByEmail(data.email);
    if (existingUser) {
      throw new Error("User already exists with this email.");
    }

    const hashedpassword = await hashpassword(data.password);

    const userToCreate: CreateUserType = {
      ...data,
      password: hashedpassword,
    };

    const createdUser = await userRepository.createUser(userToCreate);
    return createdUser;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error("User already exists with this email.");
    }
    throw err;
  }
};

export const getAllUsers = async () => {
  const users = await userRepository.getAllUsers();
  return users;
};

export const updateUserRole = async (
  userId: number,
  role: "USER" | "ADMIN",
) => {
  const existingUser = await userRepository.findUserById(userId);

  if (!existingUser || existingUser.isDeleted) {
    throw new Error("User not found!");
  }

  return userRepository.updateUserRole(userId, role);
};

export const deleteUser = async (userId: number) => {
  return userRepository.softDeleteUser(userId);
};
