import { Router } from "express";
import { auth } from "../../middlewares/auth.middleware.js";
import * as fineController from "../controller/fine.controller.js";
import generalRateLimiter from "../../middlewares/ratelimiter/generalRateLimiter.middleware.js";

const fineRouter = Router();

fineRouter.get("/my", generalRateLimiter, auth, fineController.getMyFines);

fineRouter.post("/:id/pay", generalRateLimiter, auth, fineController.payFine);

export default fineRouter;
