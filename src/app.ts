import "dotenv/config";

import express from "express";

import { Kernel } from "./core/kernel.js";
import { env } from "./config/env.js";

class App {
  public app = express();

  private kernel: Kernel = new Kernel();

  constructor() {
    this.initMiddlewares();
  }

  private initMiddlewares(): void {
    this.kernel.initBodyParser(this.app);

    this.kernel.addCommonMiddleware(this.app);

    this.kernel.initHealthCheck(this.app);

    this.kernel.initRoutes(this.app);

    this.kernel.setupSwagger(this.app);

    this.kernel.errorMiddleware(this.app);

    // Rate limiters already no-op under NODE_ENV=test; cron jobs are
    // similarly skipped there so the E2E suite doesn't fire background
    // reminder emails mid-run.
    if (env.NODE_ENV !== "test") {
      this.kernel.initCronJobs();
    }
  }
}

export default new App().app;
