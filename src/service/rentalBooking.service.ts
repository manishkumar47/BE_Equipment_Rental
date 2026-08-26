import type { CreateRentalBookingObject } from "../types/rentalBooking.type.js";
import * as rentalBookingRepository from "../database/repository/rentalBooking.repository.js";
import { sendBookingComplete } from "../util/emails/bookingEmail.js";
import { AppError } from "../util/appError.js";
import db from "../database/db-connection.js";
import { eq } from "drizzle-orm";
import { rentalBooking, equipment } from "../database/schema/schema.js";

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
  const booking = await rentalBookingRepository.getRentalBookingById(bookingId);
  if (!booking) {
    throw new AppError(404, "Booking not found!");
  }

  return await db.transaction(async (tx) => {
    // If the booking was not already returned, restore the reserved stock
    if (booking.status !== "returned") {
      const [currentEquipment] = await tx
        .select({ quantity: equipment.quantity })
        .from(equipment)
        .where(eq(equipment.id, booking.equipmentId));

      if (currentEquipment) {
        await tx
          .update(equipment)
          .set({ quantity: currentEquipment.quantity + booking.quantity })
          .where(eq(equipment.id, booking.equipmentId));
      }
    }

    const [deleted] = await tx
      .update(rentalBooking)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(rentalBooking.id, bookingId))
      .returning();

    return deleted;
  });
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
