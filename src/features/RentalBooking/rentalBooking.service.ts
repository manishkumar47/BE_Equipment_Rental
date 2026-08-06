import { CreateRentalBookingObject } from "./rentalBooking.type.js";
import * as rentalBookingRepository from "./rentalBooking.repository.js";

export const createRentalBooking = async (
  createRentalBookingObject: CreateRentalBookingObject,
) => {
  try {
    return await rentalBookingRepository.createRentalBooking(
      createRentalBookingObject,
    );
  } catch (error) {
    return null;
  }
};

export const getRentalBookingById = async (bookingId: number) => {
  return rentalBookingRepository.getRentalBookingById(bookingId);
};

export const deleteRentalBooking = async (bookingId: number) => {
  return rentalBookingRepository.deleteRentalBooking(bookingId);
};
