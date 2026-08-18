import type { MyTokenPayload } from "../features/Users/user.type.js";

declare global {
  namespace Express {
    interface Request {
      user?: MyTokenPayload;
    }
  }
}

export {};
