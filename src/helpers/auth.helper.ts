import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { errorResponse } from "./res.helper.js";
import type { MyTokenPayload } from "../types/user.type.js";
import { env } from "../config/env.js";

export const authenticateRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
  requiredRole?: "USER" | "ADMIN",
) => {
  try {
    const authHeader = req.get("Authorization") || req.headers.authorization;

    if (!authHeader) {
      return errorResponse(res, 401, "Not logged in!");
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : authHeader.trim();

    if (!token) {
      return errorResponse(res, 401, "User not authenticated!");
    }

    const decodedToken = jwt.verify(token, env.JWT_SECRET) as MyTokenPayload;

    if (!decodedToken) {
      return errorResponse(res, 401, "Invalid or expired token!");
    }

    // Role-based authorization with hierarchy: ADMIN can access USER routes
    if (requiredRole === "ADMIN" && decodedToken.role !== "ADMIN") {
      return errorResponse(res, 403, "Forbidden: Admin access required!");
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    return errorResponse(res, 401, "Invalid or expired token!");
  }
};

export const getUserIdFromToken = (req: Request): number | null => {
  if (req.user?.id) return req.user.id;

  try {
    const authHeader = req.get("Authorization") || req.headers.authorization;
    if (!authHeader) return null;
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : authHeader.trim();

    const decoded = jwt.verify(token, env.JWT_SECRET) as MyTokenPayload;
    return decoded?.id ?? null;
  } catch {
    return null;
  }
};

export const getTokenPayload = (req: Request): MyTokenPayload | null => {
  if (req.user) return req.user;

  try {
    const authHeader = req.get("Authorization") || req.headers.authorization;
    if (!authHeader) return null;

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : authHeader.trim();

    return (jwt.verify(token, env.JWT_SECRET) as MyTokenPayload) ?? null;
  } catch {
    return null;
  }
};
