import { Router } from "express";

import generalRateLimiter from "../../middlewares/ratelimiter/generalRateLimiter.middleware.js";
import * as categoryController from "../controller/category.controller.js";
const categoryRouter = Router();

categoryRouter.get(
  "/all",
  generalRateLimiter,
  categoryController.getAllCategories,
);

categoryRouter.get(
  "/",
  generalRateLimiter,
  categoryController.getAllCategories,
);

export default categoryRouter;
