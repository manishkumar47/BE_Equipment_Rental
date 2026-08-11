import "dotenv/config";
import express from "express";
import { setupSwagger } from "./config/swagger.js";
import userRouter from "./routes/user.route.js";
import authRouter from "./routes/auth.route.js";
import equipmentRouter from "./routes/equipment.route.js";
import rentalBookingRouter from "./routes/rentalBooking.route.js";

import pinoConfig, { logger } from "./lib/pinoLogger.js";
import initCronJobs from "./crons/cron.scheduler.js";
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(pinoConfig);
app.use("/users", userRouter);
app.use("/auth", authRouter);
app.use("/equipments", equipmentRouter);
app.use("/rental-bookings", rentalBookingRouter);
setupSwagger(app);

initCronJobs();

// Start Server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(
    `📄 API Documentation available at http://localhost:${PORT}/api-docs`,
  );
});
