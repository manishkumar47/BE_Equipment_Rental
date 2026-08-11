import { CreateRentalBookingObject } from "./rentalBooking.type.js";
import * as rentalBookingRepository from "./rentalBooking.repository.js";
import { sendBookingComplete } from "../../lib/emails/bookingEmail.js";

export const createRentalBooking = async (
  createRentalBookingObject: CreateRentalBookingObject,
) => {
  try {
    const rentalBooking = await rentalBookingRepository.createRentalBooking(
      createRentalBookingObject,
    );

    if (rentalBooking) {
      const { User, Equipment } = rentalBooking;

      await sendBookingComplete({
        user: {
          name: User.name,
          email: User.email,
        },

        equipment: {
          name: Equipment.name,
          description: Equipment.description,
          price: Equipment.price,
        },

        booking: {
          id: rentalBooking.id,
          quantity: rentalBooking.quantity,
          rentFrom: rentalBooking.rentFrom,
          rentTo: rentalBooking.rentTo,
        },
      });

      return rentalBooking;
    }
    return null;
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
export const getAllRentalBookings = async () => {
  return rentalBookingRepository.getAllRentalBookings();
};

export const markReminderSent = async (bookingId: number) => {
  return rentalBookingRepository.markReminderSent(bookingId);
};
