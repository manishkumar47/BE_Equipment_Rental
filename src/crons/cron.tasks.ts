import * as rentalBookingService from "../features/RentalBooking/rentalBooking.service.js";
import { logger } from "../lib/pinoLogger.js";
import { sendBookingReminder } from "../lib/emails/bookingEmail.js";

export const sendReminderEmail = async () => {
//   logger.debug("Reminder cron job started");
  try {
    const allRentalBookings = await rentalBookingService.getAllRentalBookings();
    if (allRentalBookings.length === 0) {
      logger.debug("No active rental bookings found for reminder processing.");
      return;
    }

    const now = new Date();

    for (const rentalBooking of allRentalBookings) {
      if (rentalBooking.isReminderSent) continue;

      const rentFromDate = new Date(rentalBooking.rentFrom);
      const rentToDate = new Date(rentalBooking.rentTo);

      // Skip bookings that haven't started or are already completely finished
      if (now < rentFromDate || now > rentToDate) continue;
      if (!rentalBooking.User || !rentalBooking.Equipment) continue;

      const totalDurationInMins =
        (rentToDate.getTime() - rentFromDate.getTime()) / (1000 * 60);
      const minutesRemaining =
        (rentToDate.getTime() - now.getTime()) / (1000 * 60);

      let targetBufferInMins = totalDurationInMins * 0.2;

      if (targetBufferInMins > 480) {
        targetBufferInMins = 480;
      }

      if (targetBufferInMins < 30) {
        targetBufferInMins = 30;
      }

      const windowStart = targetBufferInMins;
      const windowEnd = targetBufferInMins - 10;

      if (minutesRemaining <= windowStart && minutesRemaining > windowEnd) {
        logger.info(
          `🔔 Triggering Email for Booking ID ${rentalBooking.id}. ` +
            `Total Duration: ${(totalDurationInMins / 60).toFixed(1)}h | ` +
            `Target Buffer: ${(targetBufferInMins / 60).toFixed(1)}h | ` +
            `Time Left: ${(minutesRemaining / 60).toFixed(2)}h`,
        );

        const reminderSent = await sendBookingReminder({
          user: {
            name: rentalBooking.User.name,
            email: rentalBooking.User.email,
          },
          equipment: {
            name: rentalBooking.Equipment.name,
            description: rentalBooking.Equipment.description,
            price: rentalBooking.Equipment.price,
          },
          booking: {
            id: rentalBooking.id,
            quantity: rentalBooking.quantity,
            rentFrom: rentalBooking.rentFrom,
            rentTo: rentalBooking.rentTo,
          },
        });

        if (reminderSent) {
          await rentalBookingService.markReminderSent(rentalBooking.id);
          logger.info(
            `Reminder sent and marked for booking ${rentalBooking.id}`,
          );
        } else {
          logger.warn(
            `Reminder email failed for booking ${rentalBooking.id}; not marking reminder sent.`,
          );
        }
      }
    }
  } catch (err) {
    logger.error(`Error running dynamic reminder cron job ${err}`);
  }
};
