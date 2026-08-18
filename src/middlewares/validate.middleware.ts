import { ZodObject } from "zod";
import type{ Request, Response, NextFunction } from "express";
import { errorResponse } from "../helpers/res.helper.js";

export const validate =
  (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return errorResponse(
        res,
        400,
        "Validation failed",
        result.error.issues.map((issue) => issue.message),
      );
    }

    req.body = result.data;

    next();
  };
