import type { CreateRentalBookingObject } from "../types/rentalBooking.type.js";
import type { BookingStatusFilter } from "../database/repository/rentalBooking.repository.js";
import * as rentalBookingRepository from "../database/repository/rentalBooking.repository.js";
import * as rentalBookingItemRepository from "../database/repository/rentalBookingItem.repository.js";
import * as equipmentItemRepository from "../database/repository/equipmentItem.repository.js";
import { sendBookingComplete } from "../util/emails/bookingEmail.js";
import { AppError } from "../util/appError.js";
import db from "../database/db-connection.js";
import { eq } from "drizzle-orm";
import { rentalBooking, equipment } from "../database/schema/schema.js";

export const createRentalBooking = async (
  createRentalBookingObject: CreateRentalBookingObject,
) => {
  try {
    // Stock decrement + booking insert happen atomically in one transaction,
    // guarded by a conditional `quantity >= x` WHERE clause, so two
    // concurrent requests for the last unit(s) can't both succeed.
    const inserted = await db.transaction(async (tx) => {
      const updatedEquipment = await rentalBookingRepository.decrementEquipmentStock(
        createRentalBookingObject.equipmentId,
        createRentalBookingObject.quantity,
        tx,
      );
      if (!updatedEquipment) {
        throw new AppError(409, "Insufficient stock!");
      }

      return rentalBookingRepository.insertRentalBooking(createRentalBookingObject, tx);
    });

    const rentalBooking = inserted
      ? await rentalBookingRepository.getRentalBookingById(inserted.id)
      : undefined;

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

  // A booking with equipment physically checked out must go through the
  // return flow (active -> return_requested -> returned) before it can be
  // deleted — otherwise stock/items get silently orphaned with no record
  // the rental ever happened.
  if (booking.status === "active" || booking.status === "return_requested") {
    throw new AppError(
      409,
      `Cannot delete — booking is currently '${booking.status}'. It must be returned first.`,
    );
  }

  return await db.transaction(async (tx) => {
    // Restore the reserved stock unless it's already been accounted for:
    // 'returned' bookings restored stock at return time, 'rejected' ones
    // restored it at rejection time.
    if (booking.status !== "returned" && booking.status !== "rejected") {
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

/**
 * Admin views pending booking requests (paginated) — bookings awaiting
 * approval before they become 'active'.
 */
export const getPendingBookingRequests = async (
  page: number,
  limit: number,
  search?: string,
) => {
  const { data, total } = await rentalBookingRepository.getPendingBookingRequests(
    page,
    limit,
    search,
  );
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

/**
 * Admin views all bookings (paginated), across every status, for the
 * fleet-wide bookings table.
 */
export const getAllRentalBookingsPaginated = async (
  page: number,
  limit: number,
  search?: string,
  status?: BookingStatusFilter,
) => {
  const { data, total } = await rentalBookingRepository.getAllRentalBookingsPaginated(
    page,
    limit,
    search,
    status,
  );
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

/**
 * Admin approves a booking request. Auto-assigns up to `quantity` available
 * physical units to the booking (only if the equipment has enough tracked
 * units available) — assignment is opportunistic, never blocks approval.
 */
export const approveBookingRequest = async (bookingId: number) => {
  const booking = await rentalBookingRepository.getRentalBookingById(bookingId);
  if (!booking) {
    throw new AppError(404, "Booking not found!");
  }
  if (booking.status !== "requested") {
    throw new AppError(
      409,
      `Cannot approve — booking is currently '${booking.status}', expected 'requested'.`,
    );
  }

  return db.transaction(async (tx) => {
    const updatedBooking = await rentalBookingRepository.approveBooking(bookingId, tx);
    if (!updatedBooking) {
      throw new AppError(409, "Booking has already been processed by another admin.");
    }

    const candidates = await equipmentItemRepository.getAvailableItemsForEquipment(
      booking.equipmentId,
      booking.quantity,
    );
    if (candidates.length >= booking.quantity) {
      const claimedIds = await equipmentItemRepository.markEquipmentItemsRented(
        candidates.map((c) => c.id),
        tx,
      );
      await rentalBookingItemRepository.assignItemsToBooking(bookingId, claimedIds, tx);
    }

    return updatedBooking;
  });
};

/**
 * Admin rejects a booking request. Reverts the stock reserved at request
 * time, since the rental never happened.
 */
export const rejectBookingRequest = async (bookingId: number, rejectionReason: string) => {
  const booking = await rentalBookingRepository.getRentalBookingById(bookingId);
  if (!booking) {
    throw new AppError(404, "Booking not found!");
  }
  if (booking.status !== "requested") {
    throw new AppError(
      409,
      `Cannot reject — booking is currently '${booking.status}', expected 'requested'.`,
    );
  }

  return db.transaction(async (tx) => {
    const updatedBooking = await rentalBookingRepository.rejectBooking(
      bookingId,
      rejectionReason,
      tx,
    );
    if (!updatedBooking) {
      throw new AppError(409, "Booking has already been processed by another admin.");
    }

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

    return updatedBooking;
  });
};
