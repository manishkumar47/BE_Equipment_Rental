import { successResponse } from "../../helpers/res.helper.js";
import * as userService from "./user.service.js";
import { AppError } from "../../utils/appError.js";
export const createUser = async (req, res, next) => {
    try {
        const body = req.body;
        const user = await userService.createUser(body);
        return successResponse(res, {
            status: 201,
            message: "User created!",
            data: user,
        });
    }
    catch (err) {
        if (err instanceof Error && err.message.includes("already exists")) {
            return next(new AppError(409, err.message));
        }
        return next(err);
    }
};
export const getAllUsers = async (_req, res, next) => {
    try {
        const users = await userService.getAllUsers();
        if (!users) {
            throw new AppError(404, "No users found!");
        }
        return successResponse(res, {
            status: 200,
            message: "Users fetched",
            data: users,
        });
    }
    catch (err) {
        return next(err);
    }
};
export const updateUserRole = async (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        const body = req.body;
        const updatedUser = await userService.updateUserRole(userId, body.role);
        return successResponse(res, {
            status: 200,
            message: "User role updated",
            data: updatedUser,
        });
    }
    catch (err) {
        if (err instanceof Error && err.message === "User not found!") {
            return next(new AppError(404, err.message));
        }
        return next(err);
    }
};
export const deleteUser = async (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        await userService.deleteUser(userId);
        return successResponse(res, { status: 200, message: "User deleted" });
    }
    catch (err) {
        return next(err);
    }
};
//# sourceMappingURL=user.controller.js.map