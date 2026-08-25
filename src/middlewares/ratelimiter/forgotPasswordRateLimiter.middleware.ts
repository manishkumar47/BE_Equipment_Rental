import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

const forgotPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  limit: 5, // max 5 requests per hour per IP + email
  legacyHeaders: false,
  standardHeaders: "draft-8",
  keyGenerator: (req: Request) => {
    const email = req.body?.email
      ? String(req.body.email).toLowerCase().trim()
      : "";
    // ipKeyGenerator normalizes IPv6 and IPv4 addresses safely
    const ip = ipKeyGenerator(req.ip || "unknown");
    return `${ip}_${email}`;
  },
  message: {
    success: false,
    message:
      "Too many password reset requests. Please try again after an hour.",
    data: null,
  },
});

export default forgotPasswordRateLimiter;
