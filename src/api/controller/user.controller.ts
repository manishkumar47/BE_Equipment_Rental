import type { Request, Response, NextFunction } from "express";
import { successResponse } from "../../helpers/res.helper.js";
import * as userService from "../../service/user.service.js";
import type { CreateUserType, UpdateUserRoleType } from "../../types/user.type.js";
import { AppError } from "../../util/appError.js";

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
      return next(new AppError(409, err.message));
    }
    return next(err);
  }
};

export const getAllUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
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
  } catch (err) {
    return next(err);
  }
};

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, "User not authorized!");
    }
    const user = await userService.getUserById(userId);
    return successResponse(res, {
      status: 200,
      message: "Profile fetched",
      data: user,
    });
  } catch (err) {
    return next(err);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = Number(req.params.id);
    const user = await userService.getUserById(userId);
    return successResponse(res, {
      status: 200,
      message: "User fetched",
      data: user,
    });
  } catch (err) {
    return next(err);
  }
};

export const updateUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = Number(req.params.id);
    const body: UpdateUserRoleType = req.body;
    const updatedUser = await userService.updateUserRole(userId, body.role);

    return successResponse(res, {
      status: 200,
      message: "User role updated",
      data: updatedUser!,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "User not found!") {
      return next(new AppError(404, err.message));
    }
    return next(err);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = Number(req.params.id);
    await userService.deleteUser(userId);
    return successResponse(res, { status: 200, message: "User deleted" });
  } catch (err) {
    return next(err);
  }
};
