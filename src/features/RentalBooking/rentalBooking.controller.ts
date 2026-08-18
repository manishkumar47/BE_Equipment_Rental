import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../helpers/res.helper.js";
import * as equipmentService from "../Equipments/equipment.service.js";
import * as rentalBookingService from "./rentalBooking.service.js";
import type { CreateRentalBookingObject } from "./rentalBooking.type.js";
import { AppError } from "../../utils/appError.js";

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
