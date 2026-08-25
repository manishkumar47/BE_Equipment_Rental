import type { MyTokenPayload } from "./user.type.ts";

declare global {
  namespace Express {
    interface Request {
      user?: MyTokenPayload;
    }
  }
}

export {};
