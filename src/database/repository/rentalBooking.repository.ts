import db from "../db-connection.js";
import { eq } from "drizzle-orm";
import { rentalBooking } from "../schema/schema.js";
import type { CreateRentalBookingObject } from "../../types/rentalBooking.type.js";

export const createRentalBooking = async (
  createRentalBookingObject: CreateRentalBookingObject,
) => {
  const [inserted] = await db
    .insert(rentalBooking)
    .values(createRentalBookingObject)
    .returning();

  const booking = await db.query.rentalBooking.findFirst({
    where: { id: inserted!.id },
    with: {
      user: true,
      equipment: true,
    },
  });
  return booking;
};

export const getRentalBookingById = async (bookingId: number) => {
  return db.query.rentalBooking.findFirst({
    where: { id: bookingId, isDeleted: false },
    with: {
      user: true,
      equipment: true,
    },
  });
};

export const deleteRentalBooking = async (bookingId: number) => {
  const [deleted] = await db
    .update(rentalBooking)
    .set({ isDeleted: true, deletedAt: new Date() })
    .where(eq(rentalBooking.id, bookingId))
    .returning();
  return deleted;
};

export const getRentalBookingsByUserId = async (userId: number) => {
  return db.query.rentalBooking.findMany({
    where: { userId, isDeleted: false },
    with: {
      user: true,
      equipment: true,
    },
  });
};

export const getAllRentalBookings = async () => {
  return db.query.rentalBooking.findMany({
    where: { isDeleted: false },
    with: {
      user: true,
      equipment: true,
    },
  });
};

export const getPendingReminderBookings = async () => {
  return db.query.rentalBooking.findMany({
    where: {
      isDeleted: false,
      isReminderSent: false,
    },
    with: {
      user: true,
      equipment: true,
    },
  });
};

export const markReminderSent = async (bookingId: number) => {
  const [updated] = await db
    .update(rentalBooking)
    .set({ isReminderSent: true })
    .where(eq(rentalBooking.id, bookingId))
    .returning();
  return updated;
};
