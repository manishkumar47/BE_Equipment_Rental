import { Router } from "express";
import { rentalBookingSchema } from "../validators/rentalBooking.schema.js";
import { validate } from "../../middlewares/validate.middleware.js";

import bookingRateLimiter from "../../middlewares/ratelimiter/bookingRateLimiter.middleware.js";
import * as rentalBookingController from "../controller/rentalBooking.controller.js";
import { auth } from "../../middlewares/auth.middleware.js";
const rentalBookingRouter = Router();

rentalBookingRouter.post(
  "/",
  bookingRateLimiter,
  auth,
  validate(rentalBookingSchema),
  rentalBookingController.createRentalBooking,
);

rentalBookingRouter.get(
  "/",
  bookingRateLimiter,
  auth,
  rentalBookingController.getAllRentalBookings,
);

rentalBookingRouter.get(
  "/my",
  bookingRateLimiter,
  auth,
  rentalBookingController.getMyRentalBookings,
);

rentalBookingRouter.get(
  "/:id",
  auth,
  rentalBookingController.getRentalBookingById,
);

rentalBookingRouter.delete(
  "/:id",
  auth,
  rentalBookingController.deleteRentalBooking,
);

export default rentalBookingRouter;
