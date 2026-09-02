import { Router } from "express";
import { auth, isAdmin } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  confirmReturnSchema,
  rejectReturnSchema,
  requestReturnSchema,
} from "../validators/return.schema.js";
import * as returnController from "../controller/return.controller.js";
import generalRateLimiter from "../../middlewares/ratelimiter/generalRateLimiter.middleware.js";

// ─── User-facing routes (mounted at /rentals) ─────────────────────────

export const returnRouter = Router();

returnRouter.post(
  "/:bookingId/return-request",
  generalRateLimiter,
  auth,
  validate(requestReturnSchema),
  returnController.requestReturn,
);

// ─── Admin-facing routes (mounted at /admin/rentals) ───────────────────

export const adminReturnRouter = Router();

adminReturnRouter.get(
  "/return-requests",
  generalRateLimiter,
  isAdmin,
  returnController.getPendingReturnRequests,
);

adminReturnRouter.post(
  "/:bookingId/confirm-return",
  generalRateLimiter,
  isAdmin,
  validate(confirmReturnSchema),
  returnController.confirmReturn,
);

adminReturnRouter.post(
  "/:bookingId/reject-return",
  generalRateLimiter,
  isAdmin,
  validate(rejectReturnSchema),
  returnController.rejectReturn,
);
