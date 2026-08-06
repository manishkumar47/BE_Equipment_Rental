import * as userRepository from "./user.repository.js";
import { CreateUserType } from "./user.type.js";
import { hashpassword } from "../../helpers/bcrypt.helper.js";

export const createUser = async (data: CreateUserType) => {
  try {
    const hashedpassword = await hashpassword(data.password);

    const userToCreate: CreateUserType = {
      ...data,
      password: hashedpassword,
    };

    const createdUser = await userRepository.createUser(userToCreate);
    return createdUser;
  } catch (err) {}
};

export const getAllUsers = async () => {
  const users = await userRepository.getAllUsers();
  return users;
};

export const deleteUser = async (userId: number) => {
  return userRepository.softDeleteUser(userId);
};
