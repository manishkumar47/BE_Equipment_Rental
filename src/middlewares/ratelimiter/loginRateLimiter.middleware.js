import rateLimit from "express-rate-limit";
const loginRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 5,
    legacyHeaders: false,
    standardHeaders: "draft-8",
    message: {
        success: false,
        message: "Too many login attempts. Please try again after 5 minutes.",
        data: null,
    },
});
export default loginRateLimiter;
//# sourceMappingURL=loginRateLimiter.middleware.js.map