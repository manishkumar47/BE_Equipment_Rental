import * as userRepository from "../database/repository/user.repository.js";
import type { CreateUserType } from "../types/user.type.js";
import { hashpassword } from "../helpers/bcrypt.helper.js";
import { AppError } from "../util/appError.js";

export const createUser = async (data: CreateUserType) => {
  const existingUser = await userRepository.findUserByEmail(data.email);
  if (existingUser) {
    throw new AppError(409, "User already exists with this email.");
  }

  const hashedpassword = await hashpassword(data.password);

  const userToCreate: CreateUserType = {
    name: data.name,
    email: data.email,
    password: hashedpassword,
    role: "USER", // Default role strictly to USER on public registration
  };

  const createdUser = await userRepository.createUserByDrizzle(userToCreate);
  return createdUser;
};

export const getAllUsers = async () => {
  const users = await userRepository.getAllUsers();
  return users;
};

export const getUserById = async (userId: number) => {
  const existingUser = await userRepository.findUserById(userId);
  if (!existingUser || existingUser.isDeleted) {
    throw new AppError(404, "User not found!");
  }
  return {
    id: existingUser.id,
    name: existingUser.name,
    email: existingUser.email,
    role: existingUser.role,
    createdAt: existingUser.createdAt,
  };
};

export const updateUserRole = async (
  userId: number,
  role: "USER" | "ADMIN",
) => {
  const existingUser = await userRepository.findUserById(userId);

  if (!existingUser || existingUser.isDeleted) {
    throw new AppError(404, "User not found!");
  }

  return userRepository.updateUserRole(userId, role);
};

export const deleteUser = async (userId: number) => {
  const existingUser = await userRepository.findUserById(userId);
  if (!existingUser || existingUser.isDeleted) {
    throw new AppError(404, "User not found!");
  }
  return userRepository.softDeleteUser(userId);
};
