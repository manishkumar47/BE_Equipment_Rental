import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../helpers/res.helper.js";
import * as authService from "./auth.service.js";

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await authService.findUserByEmailAndPassword(email, password);

    if (!user) {
      return errorResponse(res, 404, "Can't find user");
    }
    const userTokenPayload = {
      id: user.id,
      email,
      role: user.role,
    };

    const token = await authService.createUserToken({ userTokenPayload });
    if (!token) {
      return errorResponse(
        res,
        500,
        "Token not generated! Please login again!",
      );
    }
    return successResponse(res, {
      status: 200,
      message: "User Found",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    return errorResponse(res, 500, `${(error as Error).message}`);
  }
};
