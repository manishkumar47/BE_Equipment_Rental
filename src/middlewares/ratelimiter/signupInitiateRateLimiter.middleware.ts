import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

const signupInitiateRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  limit: 10, // max 10 initiate requests per hour per IP + email
  legacyHeaders: false,
  standardHeaders: "draft-8",
  skip: () => process.env.NODE_ENV === "test",
  keyGenerator: (req: Request) => {
    const email = req.body?.email
      ? String(req.body.email).toLowerCase().trim()
      : "";
    const ip = ipKeyGenerator(req.ip || "unknown");
    return `${ip}_${email}`;
  },
  message: {
    success: false,
    message:
      "Too many signup attempts. Please try again after an hour.",
    data: null,
  },
});

export default signupInitiateRateLimiter;
