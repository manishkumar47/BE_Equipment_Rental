import { Router } from "express";
import { rentalBookingSchema, rejectBookingRequestSchema } from "../validators/rentalBooking.schema.js";
import { validate } from "../../middlewares/validate.middleware.js";

import bookingRateLimiter from "../../middlewares/ratelimiter/bookingRateLimiter.middleware.js";
import generalRateLimiter from "../../middlewares/ratelimiter/generalRateLimiter.middleware.js";
import * as rentalBookingController from "../controller/rentalBooking.controller.js";
import { auth, isAdmin } from "../../middlewares/auth.middleware.js";
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

// ─── Admin-facing booking-request routes (mounted at /admin/rental-bookings) ───

export const adminRentalBookingRouter = Router();

adminRentalBookingRouter.get(
  "/",
  generalRateLimiter,
  isAdmin,
  rentalBookingController.getAllBookingsPaginated,
);

adminRentalBookingRouter.get(
  "/requests",
  generalRateLimiter,
  isAdmin,
  rentalBookingController.getPendingBookingRequests,
);

adminRentalBookingRouter.post(
  "/:id/approve",
  generalRateLimiter,
  isAdmin,
  rentalBookingController.approveBooking,
);

adminRentalBookingRouter.post(
  "/:id/reject",
  generalRateLimiter,
  isAdmin,
  validate(rejectBookingRequestSchema),
  rentalBookingController.rejectBooking,
);

export default rentalBookingRouter;
