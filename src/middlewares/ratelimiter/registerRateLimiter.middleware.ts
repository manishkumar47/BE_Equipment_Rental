import rateLimit from "express-rate-limit";

const registerRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  legacyHeaders: false,
  standardHeaders: "draft-8",
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message: "Too many attempts. Please try again after 5 minutes.",
    data: null,
  },
});
export default registerRateLimiter;
