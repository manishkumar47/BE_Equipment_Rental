import rateLimit from "express-rate-limit";
const bookingRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    legacyHeaders: false,
    standardHeaders: "draft-8",
    message: {
        success: false,
        message: "Too many booking requests. Please try again after 15 minutes.",
        data: null,
    },
});
export default bookingRateLimiter;
//# sourceMappingURL=bookingRateLimiter.middleware.js.map