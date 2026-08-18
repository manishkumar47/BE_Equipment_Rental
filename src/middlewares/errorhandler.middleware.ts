import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError.js";
import { errorResponse } from "../helpers/res.helper.js";
import { logger } from "../services/pinoLogger.js";

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof AppError) {
    return errorResponse(res, error.statusCode, error.message);
  }

  logger.error({ err: error }, "Unhandled server error");
  return errorResponse(res, 500, "Internal Server Error");
};
