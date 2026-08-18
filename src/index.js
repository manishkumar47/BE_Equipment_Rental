import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { setupSwagger } from "./config/swagger.js";
import userRouter from "./routes/user.route.js";
import authRouter from "./routes/auth.route.js";
import equipmentRouter from "./routes/equipment.route.js";
import rentalBookingRouter from "./routes/rentalBooking.route.js";
import pinoConfig, { logger } from "./services/pinoLogger.js";
import initCronJobs from "./crons/cron.scheduler.js";
import { errorHandler } from "./middlewares/errorhandler.middleware.js";
import { env } from "./config/env.js";
const app = express();
// Security Middlewares
app.use(helmet());
app.use(cors({
    origin: env.FRONTEND_URL || "*",
    credentials: true,
}));
app.use(express.json());
app.use(pinoConfig);
// Health Check
app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// Application Routes
app.use("/users", userRouter);
app.use("/auth", authRouter);
app.use("/equipments", equipmentRouter);
app.use("/rental-bookings", rentalBookingRouter);
// Swagger Docs & Global Error Handler
setupSwagger(app);
app.use(errorHandler);
// Cron Jobs
initCronJobs();
// Start Server
const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
    logger.info(`📄 API Documentation available at http://localhost:${env.PORT}/api-docs`);
});
// Graceful Shutdown
const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
        logger.info("HTTP server closed. Exiting process.");
        process.exit(0);
    });
    setTimeout(() => {
        logger.error("Forcing shutdown after timeout.");
        process.exit(1);
    }, 10000);
};
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
export default app;
//# sourceMappingURL=index.js.map