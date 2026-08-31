import rateLimit from "express-rate-limit";

const generalRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 100,
  legacyHeaders: false,
  standardHeaders: "draft-8",
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    data: null,
  },
});

export default generalRateLimiter;
