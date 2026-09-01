import type { NextFunction, Request, Response } from "express";
import { successResponse, errorResponse } from "../../helpers/res.helper.js";
import * as equipmentService from "../../service/equipment.service.js";
import * as rentalBookingService from "../../service/rentalBooking.service.js";
import type { CreateRentalBookingObject } from "../../types/rentalBooking.type.js";
import { AppError } from "../../util/appError.js";
import { paginationSchema } from "../validators/return.schema.js";

export const createRentalBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { equipmentId, rentTo, rentFrom, quantity } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, "User not authorized!");
    }
    const equipment = await equipmentService.getEquipmentFromId(equipmentId);
    if (!equipment) {
      throw new AppError(404, "Equipment Not Found!");
    }
    if (quantity > equipment.quantity) {
      throw new AppError(409, "Insufficient stock!");
    }
    const createRentalBookingObject: CreateRentalBookingObject = {
      userId,
      equipmentId,
      rentTo,
      rentFrom,
      quantity,
    };
    const rentalBooking = await rentalBookingService.createRentalBooking(
      createRentalBookingObject,
    );

    if (!rentalBooking) {
      throw new AppError(500, "Could not create booking!");
    }
    await equipmentService.updateEquipment(equipmentId, {
      quantity: equipment.quantity - quantity,
    });
    return successResponse(res, {
      status: 201,
      message: "Booking created!",
      data: rentalBooking,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllRentalBookings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const isAdmin = req.user?.role === "ADMIN";
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, "User not authorized!");
    }

    let bookings;
    if (isAdmin) {
      bookings = await rentalBookingService.getAllRentalBookings();
    } else {
      bookings = await rentalBookingService.getRentalBookingsByUserId(userId);
    }

    return successResponse(res, {
      status: 200,
      message: "Bookings fetched!",
      data: bookings,
    });
  } catch (error) {
    return next(error);
  }
};

export const getMyRentalBookings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, "User not authorized!");
    }

    const bookings =
      await rentalBookingService.getRentalBookingsByUserId(userId);
    return successResponse(res, {
      status: 200,
      message: "User bookings fetched!",
      data: bookings,
    });
  } catch (error) {
    return next(error);
  }
};

export const getRentalBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const bookingId = Number(req.params.id);
    const requesterId = req.user?.id;

    if (!requesterId) {
      throw new AppError(401, "User not logged in!");
    }

    const booking = await rentalBookingService.getRentalBookingById(bookingId);
    if (!booking) {
      throw new AppError(404, "Booking not found!");
    }

    const isAdmin = req.user?.role === "ADMIN";
    if (!isAdmin && booking.userId !== requesterId) {
      throw new AppError(403, "Not authorized!");
    }

    return successResponse(res, {
      status: 200,
      message: "Booking fetched!",
      data: booking,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteRentalBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const bookingId = Number(req.params.id);
    const requesterId = req.user?.id;

    if (!requesterId) {
      throw new AppError(401, "User not logged in!");
    }

    const booking = await rentalBookingService.getRentalBookingById(bookingId);
    if (!booking) {
      throw new AppError(404, "Booking not found!");
    }

    const isAdmin = req.user?.role === "ADMIN";
    if (!isAdmin && booking.userId !== requesterId) {
      throw new AppError(403, "Not authorized!");
    }

    await rentalBookingService.deleteRentalBooking(bookingId);

    return successResponse(res, {
      status: 200,
      message: "Booking deleted!",
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Admin views pending booking requests (paginated).
 * GET /admin/rental-bookings/requests
 */
export const getPendingBookingRequests = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
      return errorResponse(
        res,
        400,
        "Invalid pagination parameters",
        parsed.error.issues.map((issue) => issue.message),
      );
    }

    const { page, limit, search } = parsed.data;
    const result = await rentalBookingService.getPendingBookingRequests(page, limit, search);

    return successResponse(res, {
      status: 200,
      message: "Pending booking requests fetched!",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Admin approves a booking request.
 * POST /admin/rental-bookings/:id/approve
 */
export const approveBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const bookingId = Number(req.params.id);
    if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
      throw new AppError(400, "Invalid booking ID!");
    }

    const booking = await rentalBookingService.approveBookingRequest(bookingId);

    return successResponse(res, {
      status: 200,
      message: "Booking approved!",
      data: booking,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Admin rejects a booking request.
 * POST /admin/rental-bookings/:id/reject
 */
export const rejectBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const bookingId = Number(req.params.id);
    if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
      throw new AppError(400, "Invalid booking ID!");
    }

    const { rejectionReason } = req.body;
    const booking = await rentalBookingService.rejectBookingRequest(bookingId, rejectionReason);

    return successResponse(res, {
      status: 200,
      message: "Booking rejected!",
      data: booking,
    });
  } catch (error) {
    return next(error);
  }
};
