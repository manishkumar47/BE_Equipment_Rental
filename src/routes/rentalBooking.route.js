import { Router } from "express";
import { rentalBookingSchema } from "../features/RentalBooking/rentalBooking.schema.js";
import { validate } from "../middlewares/validate.middleware.js";
import { auth } from "../features/Auth/auth.middleware.js";
import bookingRateLimiter from "../middlewares/ratelimiter/bookingRateLimiter.middleware.js";
import * as rentalBookingController from "../features/RentalBooking/rentalBooking.controller.js";
const rentalBookingRouter = Router();
/**
 * @openapi
 * /rental-bookings:
 *   post:
 *     summary: Create a rental booking
 *     tags: [RentalBooking]
 *     security:
 *       - AuthorizationAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rentFrom
 *               - rentTo
 *               - equipmentId
 *             properties:
 *               rentFrom:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-08-10T10:00:00.000Z
 *               rentTo:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-08-12T10:00:00.000Z
 *               quantity:
 *                 type: integer
 *                 example: 2
 *               equipmentId:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       201:
 *         description: Rental booking created successfully
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
rentalBookingRouter.post("/", bookingRateLimiter, auth, validate(rentalBookingSchema), rentalBookingController.createRentalBooking);
/**
 * @openapi
 * /rental-bookings/{id}:
 *   delete:
 *     summary: Soft-delete a rental booking
 *     tags: [RentalBooking]
 *     security:
 *       - AuthorizationAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Booking soft-deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
rentalBookingRouter.delete("/:id", auth, rentalBookingController.deleteRentalBooking);
export default rentalBookingRouter;
//# sourceMappingURL=rentalBooking.route.js.map