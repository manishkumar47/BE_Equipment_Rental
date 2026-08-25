import type { Express } from "express";
import express from "express";
import helmet from "helmet";
import cors from "cors";

import pinoConfig from "./pinoLogger.js";

import { setupSwagger } from "../config/swagger.js";
import { env } from "../config/env.js";

import userRouter from "../api/routes/user.route.js";
import authRouter from "../api/routes/auth.route.js";
import equipmentRouter from "../api/routes/equipment.route.js";
import rentalBookingRouter from "../api/routes/rentalBooking.route.js";
import categoryRouter from "../api/routes/category.route.js";

import { errorHandler } from "../middlewares/errorhandler.middleware.js";
import initCronJobs from "../cron/cron.scheduler.js";

export class Kernel {
  public initBodyParser(app: Express): void {
    app.use(express.json());
  }

  public addCommonMiddleware(app: Express): void {
    app.use(helmet());

    app.use(
      cors({
        origin: env.FRONTEND_URL || "*",
        credentials: true,
      }),
    );

    app.use(pinoConfig);
  }

  public initHealthCheck(app: Express): void {
    app.get("/health", (_req, res) => {
      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });
  }

  public initRoutes(app: Express): void {
    app.use("/users", userRouter);
    app.use("/auth", authRouter);
    app.use("/equipments", equipmentRouter);
    app.use("/rental-bookings", rentalBookingRouter);
    app.use("/category", categoryRouter);
  }

  public setupSwagger(app: Express): void {
    setupSwagger(app);
  }

  public errorMiddleware(app: Express): void {
    app.use(errorHandler);
  }

  public initCronJobs(): void {
    initCronJobs();
  }
}
