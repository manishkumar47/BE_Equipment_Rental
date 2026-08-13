import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../helpers/res.helper.js";
import * as authService from "./auth.service.js";
import { sendResetPassword } from "../../lib/emails/resetPasswordEmail.js";
import { hashpassword } from "../../helpers/bcrypt.helper.js";
import { logger } from "../../lib/pinoLogger.js";

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

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { password, token } = req.body;

    if (!token) return errorResponse(res, 400, "No token provided in headers");
    if (!password) return errorResponse(res, 400, "New password is required");

    const payload = await authService.verifyPasswordResetToken(token);
    // logger.debug(`-___--_--_--__pyaload,${payload}`);
    if (!payload || !payload.email) {
      return errorResponse(res, 400, "Invalid or expired token");
    }

    const hashed = await hashpassword(password);
    await authService.updateUserPassword(payload.email, hashed);
    await authService.markPasswordResetUsed(payload.id);

    return successResponse(res, { status: 200, message: "Password updated" });
  } catch (error) {
    return errorResponse(res, 500, `${(error as Error).message}`);
  }
};
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return errorResponse(res, 400, "Email is required");

    const user = await authService.findUserByEmail(email);
    if (!user) return errorResponse(res, 404, "User not found");

    const token = await authService.createPasswordResetToken(email);
    if (!token) return errorResponse(res, 500, "Could not create reset token");

    const sent = await sendResetPassword({
      user: { name: user.name, email: user.email },
      token,
    });
    if (!sent) return errorResponse(res, 500, "Failed to send reset email");

    return successResponse(res, { status: 200, message: "Reset email sent" });
  } catch (error) {
    return errorResponse(res, 500, `${(error as Error).message}`);
  }
};
