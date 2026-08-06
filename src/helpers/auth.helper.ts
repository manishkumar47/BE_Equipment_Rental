import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { errorResponse } from "./res.helper.js";

import { MyTokenPayload } from "../features/Users/user.type.js";

export const authenticateRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
  requiredRole?: "USER" | "ADMIN",
) => {
  try {
    const authHeader = req.get("Authorization") || req.headers.authorization;

    if (!authHeader) {
      return errorResponse(res, 401, "No token");
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : authHeader.trim();

    if (!token) {
      return errorResponse(res, 401, "User not authenticated!");
    }

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET!,
    ) as MyTokenPayload;

    if (!decodedToken) {
      return errorResponse(res, 401, "Invalid or expired token!");
    }

    if (requiredRole) {
      if (decodedToken.role !== requiredRole) {
        return errorResponse(res, 403, "Not authorized!");
      }
    } else if (decodedToken.role !== "USER") {
      return errorResponse(res, 403, "Not authorized!");
    }

    next();
  } catch (error) {
    return errorResponse(res, 401, "Invalid or expired token!");
  }
};

export const getUserIdFromToken = async (req: Request) => {
  try {
    const authHeader = req.get("Authorization") || req.headers.authorization;
    if (!authHeader) return null;
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : authHeader.trim();

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET || "secret",
    ) as MyTokenPayload;
    return decodedToken.id;
  } catch (error) {
    return null;
  }
};

export const getTokenPayload = async (req: Request) => {
  try {
    const authHeader = req.get("Authorization") || req.headers.authorization;
    if (!authHeader) return null;

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : authHeader.trim();

    return jwt.verify(
      token,
      process.env.JWT_SECRET || "secret",
    ) as MyTokenPayload;
  } catch (error) {
    return null;
  }
};
