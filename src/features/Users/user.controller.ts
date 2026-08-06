import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../helpers/res.helper.js";
import * as userService from "./user.service.js";
import { CreateUserType } from "./user.type.js";

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
    return errorResponse(res, 500, "Internal Server Error");
  }
};

export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await userService.getAllUsers();
    return successResponse(res, { status: 200, message: "Users fetched", data: users });
  } catch (err) {
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
