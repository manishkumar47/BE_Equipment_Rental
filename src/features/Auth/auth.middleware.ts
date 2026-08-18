import type { NextFunction, Request, Response } from "express";
import { authenticateRequest } from "../../helpers/auth.helper.js";

export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  return authenticateRequest(req, res, next, "ADMIN");
};

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  return authenticateRequest(req, res, next, "USER");
};
