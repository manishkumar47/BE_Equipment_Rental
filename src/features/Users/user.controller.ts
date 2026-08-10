import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../helpers/res.helper.js";
import * as userService from "./user.service.js";
import { CreateUserType, UpdateUserRoleType } from "./user.type.js";

export const createUser = async (req: Request, res: Response) => {
  try {
    const body: CreateUserType = req.body;
    const user = await userService.createUser(body);
    return successResponse(res, {
      status: 201,
      message: "User created!",
      data: user,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("already exists")) {
      return errorResponse(res, 409, err.message);
    }
    return errorResponse(res, 500, "Internal Server Error");
  }
};

export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await userService.getAllUsers();
    if (!users) {
      return errorResponse(res, 404, "No users found!");
    }
    return successResponse(res, {
      status: 200,
      message: "Users fetched",
      data: users,
    });
  } catch (err) {
    return errorResponse(res, 500, "Internal Server Error");
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const body: UpdateUserRoleType = req.body;
    const updatedUser = await userService.updateUserRole(userId, body.role);

    return successResponse(res, {
      status: 200,
      message: "User role updated",
      data: updatedUser,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "User not found!") {
      return errorResponse(res, 404, err.message);
    }
    return errorResponse(res, 500, "Internal Server Error");
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    await userService.deleteUser(userId);
    return successResponse(res, { status: 200, message: "User deleted" });
  } catch (err) {
    return errorResponse(res, 500, "Internal Server Error");
  }
};
