import type { CreateRentalBookingObject } from "./rentalBooking.type.js";
import * as rentalBookingRepository from "./rentalBooking.repository.js";
import { sendBookingComplete } from "../../lib/emails/bookingEmail.js";
import { AppError } from "../../utils/appError.js";

export const createRentalBooking = async (
  createRentalBookingObject: CreateRentalBookingObject,
) => {
  try {
    const rentalBooking = await rentalBookingRepository.createRentalBooking(
      createRentalBookingObject,
    );

    if (rentalBooking) {
      const { user, equipment } = rentalBooking;

      if (user && equipment) {
        await sendBookingComplete({
          user: {
            name: user.name,
            email: user.email,
          },

          equipment: {
            name: equipment.name,
            description: equipment.description,
            price: equipment.price,
          },

          booking: {
            id: rentalBooking.id,
            quantity: rentalBooking.quantity,
            rentFrom: rentalBooking.rentFrom,
            rentTo: rentalBooking.rentTo,
          },
        });
      }

      return rentalBooking;
    }
    throw new AppError(500, "Could not create booking");
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      500,
      (error as Error).message || "Internal Server Error",
    );
  }
};

export const getRentalBookingById = async (bookingId: number) => {
  return rentalBookingRepository.getRentalBookingById(bookingId);
};

export const deleteRentalBooking = async (bookingId: number) => {
  return rentalBookingRepository.deleteRentalBooking(bookingId);
};

export const getRentalBookingsByUserId = async (userId: number) => {
  return rentalBookingRepository.getRentalBookingsByUserId(userId);
};

export const getAllRentalBookings = async () => {
  return rentalBookingRepository.getAllRentalBookings();
};

export const getPendingReminderBookings = async () => {
  return rentalBookingRepository.getPendingReminderBookings();
};

export const markReminderSent = async (bookingId: number) => {
  return rentalBookingRepository.markReminderSent(bookingId);
};
