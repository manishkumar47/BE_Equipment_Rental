import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../helpers/res.helper.js";
import {
  getTokenPayload,
  getUserIdFromToken,
} from "../../helpers/auth.helper.js";
import * as equipmentService from "../Equipments/equipment.service.js";
import * as rentalBookingService from "./rentalBooking.service.js";
import { CreateRentalBookingObject } from "./rentalBooking.type.js";

export const createRentalBooking = async (req: Request, res: Response) => {
  try {
    const { equipmentId, rentTo, rentFrom, quantity } = req.body;

    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return errorResponse(res, 401, "User not authorized!");
    }
    const equipment = await equipmentService.getEquipmentFromId(equipmentId);
    if (!equipment) {
      return errorResponse(res, 404, "Equipment Not Found!");
    }
    if (quantity > equipment.quantity) {
      return errorResponse(res, 409, "Insufficient stock!");
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
      return errorResponse(res, 500, "Could not create booking!");
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
    return errorResponse(res, 500, `${(error as Error).message}`);
  }
};

export const deleteRentalBooking = async (req: Request, res: Response) => {
  try {
    const bookingId = Number(req.params.id);
    const requesterId = await getUserIdFromToken(req);

    if (!requesterId) {
      return errorResponse(res, 401, "User not logged in!");
    }

    const booking = await rentalBookingService.getRentalBookingById(bookingId);
    if (!booking) {
      return errorResponse(res, 404, "Booking not found!");
    }

    const decodedToken = await getTokenPayload(req);
    const isAdmin = decodedToken?.role === "ADMIN";
    if (!isAdmin && booking.userId !== requesterId) {
      return errorResponse(res, 403, "Not authorized!");
    }

    await rentalBookingService.deleteRentalBooking(bookingId);

    return successResponse(res, {
      status: 200,
      message: "Booking deleted!",
    });
  } catch (error) {
    return errorResponse(res, 500, `${(error as Error).message}`);
  }
};
