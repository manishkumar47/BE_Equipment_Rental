import * as rentalBookingService from "../features/RentalBooking/rentalBooking.service.js";
import { logger } from "../services/pinoLogger.js";
import { sendBookingReminder } from "../lib/emails/bookingEmail.js";

export const sendReminderEmail = async () => {
  try {
    const pendingBookings =
      await rentalBookingService.getPendingReminderBookings();
    if (pendingBookings.length === 0) {
      return;
    }

    const now = new Date();

    for (const rentalBooking of pendingBookings) {
      if (rentalBooking.isReminderSent) continue;

      const rentFromDate = new Date(rentalBooking.rentFrom);
      const rentToDate = new Date(rentalBooking.rentTo);

      // Skip bookings that haven't started or are already completely finished
      if (now < rentFromDate || now > rentToDate) continue;
      if (!rentalBooking.user || !rentalBooking.equipment) continue;

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

      // Check if current time is within or past reminder buffer window
      if (minutesRemaining <= targetBufferInMins) {
        logger.info(
          `🔔 Triggering Email for Booking ID ${rentalBooking.id}. ` +
            `Total Duration: ${(totalDurationInMins / 60).toFixed(1)}h | ` +
            `Target Buffer: ${(targetBufferInMins / 60).toFixed(1)}h | ` +
            `Time Left: ${(minutesRemaining / 60).toFixed(2)}h`,
        );

        const reminderSent = await sendBookingReminder({
          user: {
            name: rentalBooking.user.name,
            email: rentalBooking.user.email,
          },
          equipment: {
            name: rentalBooking.equipment.name,
            description: rentalBooking.equipment.description,
            price: rentalBooking.equipment.price,
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
    logger.error({ err }, "Error running dynamic reminder cron job");
  }
};
