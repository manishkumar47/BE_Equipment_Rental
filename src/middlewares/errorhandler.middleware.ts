import type { Request, Response, NextFunction } from "express";
import { AppError } from "../util/appError.js";
import { errorResponse } from "../helpers/res.helper.js";
import { logger } from "../core/pinoLogger.js";
import { Sentry } from "../core/sentry.js";

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof AppError) {
    // Only unexpected 5xx failures go to Sentry — expected 4xx AppErrors
    // (validation, auth, not-found, etc.) are normal traffic, not incidents.
    if (error.statusCode >= 500) {
      Sentry.captureException(error);
    }
    return errorResponse(res, error.statusCode, error.message);
  }

  logger.error({ err: error }, "Unhandled server error");
  Sentry.captureException(error);
  return errorResponse(res, 500, "Internal Server Error");
};
