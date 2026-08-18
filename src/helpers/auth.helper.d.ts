import type { NextFunction, Request, Response } from "express";
import type { MyTokenPayload } from "../features/Users/user.type.js";
export declare const authenticateRequest: (req: Request, res: Response, next: NextFunction, requiredRole?: "USER" | "ADMIN") => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getUserIdFromToken: (req: Request) => number | null;
export declare const getTokenPayload: (req: Request) => MyTokenPayload | null;
//# sourceMappingURL=auth.helper.d.ts.map