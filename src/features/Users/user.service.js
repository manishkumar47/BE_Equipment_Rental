import * as userRepository from "./user.repository.js";
import { hashpassword } from "../../helpers/bcrypt.helper.js";
import { AppError } from "../../utils/appError.js";
export const createUser = async (data) => {
    const existingUser = await userRepository.findUserByEmail(data.email);
    if (existingUser) {
        throw new AppError(409, "User already exists with this email.");
    }
    const hashedpassword = await hashpassword(data.password);
    const userToCreate = {
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
export const updateUserRole = async (userId, role) => {
    const existingUser = await userRepository.findUserById(userId);
    if (!existingUser || existingUser.isDeleted) {
        throw new AppError(404, "User not found!");
    }
    return userRepository.updateUserRole(userId, role);
};
export const deleteUser = async (userId) => {
    const existingUser = await userRepository.findUserById(userId);
    if (!existingUser || existingUser.isDeleted) {
        throw new AppError(404, "User not found!");
    }
    return userRepository.softDeleteUser(userId);
};
//# sourceMappingURL=user.service.js.map