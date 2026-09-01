import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../helpers/res.helper.js";
import * as fineService from "../../service/fine.service.js";
import { AppError } from "../../util/appError.js";

export const getMyFines = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, "User not authorized!");
    }

    const fines = await fineService.getMyFines(userId);

    return successResponse(res, {
      status: 200,
      message: "Fines fetched!",
      data: fines,
    });
  } catch (error) {
    return next(error);
  }
};

export const payFine = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const fineId = Number(req.params.id);
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, "User not authorized!");
    }
    if (!fineId || isNaN(fineId) || fineId <= 0) {
      throw new AppError(400, "Invalid fine ID!");
    }

    const fine = await fineService.payFine(fineId, userId);

    return successResponse(res, {
      status: 200,
      message: "Fine paid successfully!",
      data: fine,
    });
  } catch (error) {
    return next(error);
  }
};
