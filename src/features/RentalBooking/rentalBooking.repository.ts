import prismaClient from "../../lib/prisma.js";
import { CreateRentalBookingObject } from "./rentalBooking.type.js";

export const createRentalBooking = async (
  createRentalBookingObject: CreateRentalBookingObject,
) => {
  const rentalBooking = await prismaClient.rentalBooking.create({
    data: createRentalBookingObject,
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
