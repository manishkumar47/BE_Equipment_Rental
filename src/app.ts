import "dotenv/config";

import express from "express";

import { Kernel } from "./core/kernel.js";

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
  }
}

export default new App().app;
