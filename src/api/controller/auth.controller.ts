import type { Request, Response, NextFunction } from "express";
import { successResponse } from "../../helpers/res.helper.js";
import * as authService from "../../service/auth.service.js";
import { AppError } from "../../util/appError.js";

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    const user = await authService.findUserByEmailAndPassword(email, password);
    if (!user) {
      throw new AppError(404, "Can't find user");
    }
    const userTokenPayload = {
      id: user.id,
      email,
      role: user.role,
    };

    const token = await authService.createUserToken({ userTokenPayload });
    if (!token) {
      throw new AppError(500, "Token not generated! Please login again!");
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
    return next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { password, token } = req.body;

    await authService.resetPassword(token, password);

    return successResponse(res, {
      status: 200,
      message: "Password updated successfully",
    });
  } catch (error) {
    return next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;

    await authService.requestPasswordReset(email);

    // Always return generic success response to prevent email enumeration
    return successResponse(res, {
      status: 200,
      message: "If that email exists, a reset link has been sent.",
    });
  } catch (error) {
    return next(error);
  }
};

export const signupInitiate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.initiateSignup({ name, email, password });

    return successResponse(res, {
      status: 200,
      message: result.message,
    });
  } catch (error) {
    return next(error);
  }
};

export const signupResend = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;
    const result = await authService.resendSignupOtp(email);

    return successResponse(res, {
      status: 200,
      message: result.message,
    });
  } catch (error) {
    return next(error);
  }
};

export const signupVerify = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, otp } = req.body;
    const userSession = await authService.verifySignupOtp({ email, otp });

    return successResponse(res, {
      status: 201,
      message: "Account created and verified successfully",
      data: userSession,
    });
  } catch (error) {
    return next(error);
  }
};

