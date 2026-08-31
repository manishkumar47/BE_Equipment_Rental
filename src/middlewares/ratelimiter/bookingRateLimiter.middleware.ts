import rateLimit from "express-rate-limit";

const bookingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  legacyHeaders: false,
  standardHeaders: "draft-8",
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message: "Too many booking requests. Please try again after 15 minutes.",
    data: null,
  },
});

export default bookingRateLimiter;
