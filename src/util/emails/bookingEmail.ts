import type { BookingEmailProps } from "../../types/nodemailer.types.js";
import { transporter } from "../nodemailer.js";
import { logger } from "../../core/pinoLogger.js";
import { renderEmailTemplate } from "./templateRenderer.js";

const formatDateTime = (date: Date) => date.toLocaleString();

const buildBookingContext = ({
  user,
  equipment,
  booking,
}: BookingEmailProps) => ({
  user,
  equipment,
  booking: {
    ...booking,
    rentFrom: formatDateTime(booking.rentFrom),
    rentTo: formatDateTime(booking.rentTo),
  },
});

export const sendBookingComplete = async ({
  user,
  equipment,
  booking,
}: BookingEmailProps) => {
  try {
    const context = buildBookingContext({ user, equipment, booking });
    const html = await renderEmailTemplate("bookingComplete", context);
    const text = await renderEmailTemplate("bookingCompleteText", context);

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: "Equipment Rental Booking Confirmed",
      text,
      html,
    });

    logger.info(`Booking confirmation sent to ${user.email}`);
  } catch (error) {
    logger.error({ err: error }, "Failed to send booking confirmation");
  }
};

export const sendBookingReminder = async ({
  user,
  equipment,
  booking,
}: BookingEmailProps) => {
  try {
    const remainingMinutes = Math.max(
      0,
      Math.round(
        (booking.rentTo.getTime() - new Date().getTime()) / (1000 * 60),
      ),
    );
    const remainingHours = Math.floor(remainingMinutes / 60);
    const remainingMins = remainingMinutes % 60;
    const remainingString =
      remainingHours > 0
        ? `${remainingHours}h ${remainingMins}m`
        : `${remainingMins} minute${remainingMins === 1 ? "" : "s"}`;

    const context = {
      user,
      equipment,
      booking: {
        ...booking,
        rentFrom: formatDateTime(booking.rentFrom),
        rentTo: formatDateTime(booking.rentTo),
        remainingString,
      },
    };

    const html = await renderEmailTemplate("bookingReminder", context);
    const text = await renderEmailTemplate("bookingReminderText", context);

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: "Reminder: Your rental is about to expire soon",
      text,
      html,
    });

    logger.info(
      `Reminder email sent to ${user.email} for booking ${booking.id}`,
    );
    return true;
  } catch (error) {
    logger.error({ err: error }, "Failed to send booking reminder");
    return false;
  }
};
