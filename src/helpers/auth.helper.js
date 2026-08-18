import jwt from "jsonwebtoken";
import { errorResponse } from "./res.helper.js";
import { env } from "../config/env.js";
export const authenticateRequest = async (req, res, next, requiredRole) => {
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
        const decodedToken = jwt.verify(token, env.JWT_SECRET);
        if (!decodedToken) {
            return errorResponse(res, 401, "Invalid or expired token!");
        }
        // Role-based authorization with hierarchy: ADMIN can access USER routes
        if (requiredRole === "ADMIN" && decodedToken.role !== "ADMIN") {
            return errorResponse(res, 403, "Forbidden: Admin access required!");
        }
        req.user = decodedToken;
        next();
    }
    catch (error) {
        return errorResponse(res, 401, "Invalid or expired token!");
    }
};
export const getUserIdFromToken = (req) => {
    if (req.user?.id)
        return req.user.id;
    try {
        const authHeader = req.get("Authorization") || req.headers.authorization;
        if (!authHeader)
            return null;
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.replace("Bearer ", "").trim()
            : authHeader.trim();
        const decoded = jwt.verify(token, env.JWT_SECRET);
        return decoded?.id ?? null;
    }
    catch {
        return null;
    }
};
export const getTokenPayload = (req) => {
    if (req.user)
        return req.user;
    try {
        const authHeader = req.get("Authorization") || req.headers.authorization;
        if (!authHeader)
            return null;
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.replace("Bearer ", "").trim()
            : authHeader.trim();
        return jwt.verify(token, env.JWT_SECRET) ?? null;
    }
    catch {
        return null;
    }
};
//# sourceMappingURL=auth.helper.js.map