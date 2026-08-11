import prismaClient from "../../lib/prisma.js";
import { CreateRentalBookingObject } from "./rentalBooking.type.js";

export const createRentalBooking = async (
  createRentalBookingObject: CreateRentalBookingObject,
) => {
  const rentalBooking = await prismaClient.rentalBooking.create({
    data: createRentalBookingObject,
    include: {
      User: true,
      Equipment: true,
    },
  });
  return rentalBooking;
};

export const getRentalBookingById = async (bookingId: number) => {
  return prismaClient.rentalBooking.findFirst({
    where: { id: bookingId, isDeleted: false },
  });
};

export const deleteRentalBooking = async (bookingId: number) => {
  return prismaClient.rentalBooking.update({
    where: { id: bookingId },
    data: { isDeleted: true, deletedAt: new Date() },
  });
};

export const getAllRentalBookings = async () => {
  return prismaClient.rentalBooking.findMany({
    where: { isDeleted: false },
    include: {
      User: true,
      Equipment: true,
    },
  });
};

export const markReminderSent = async (bookingId: number) => {
  return prismaClient.rentalBooking.update({
    where: { id: bookingId },
    data: { isReminderSent: true },
  });
};
