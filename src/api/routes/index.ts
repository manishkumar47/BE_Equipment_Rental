import { Router } from "express";

import userRouter from "./user.route.js";
import authRouter from "./auth.route.js";
import equipmentRouter from "./equipment.route.js";
import rentalBookingRouter, { adminRentalBookingRouter } from "./rentalBooking.route.js";
import categoryRouter from "./category.route.js";
import { returnRouter, adminReturnRouter } from "./return.route.js";
import fineRouter from "./fine.route.js";

const router = Router();

router.use("/users", userRouter);
router.use("/auth", authRouter);
router.use("/equipments", equipmentRouter);
router.use("/rental-bookings", rentalBookingRouter);
router.use("/category", categoryRouter);
router.use("/rentals", returnRouter);
router.use("/admin/rentals", adminReturnRouter);
router.use("/admin/rental-bookings", adminRentalBookingRouter);
router.use("/fines", fineRouter);

export default router;
