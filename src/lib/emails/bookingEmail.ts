import { BookingEmailProps } from "../../types/nodemailer.types.js";
import { transporter } from "../nodemailer.js";
import { logger } from "../pinoLogger.js";

export const sendBookingComplete = async ({
  user,
  equipment,
  booking,
}: BookingEmailProps) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: user.email,

      subject: "Equipment Rental Booking Confirmed",
      text: `
Hello ${user.name},

Your equipment rental booking has been confirmed.



Equipment: ${equipment.name}
Quantity: ${booking.quantity}
Price: ${equipment.price}

Rented From: ${booking.rentFrom.toLocaleString()}
Rented To: ${booking.rentTo.toLocaleString()}

Thank you for using our Equipment Rental System.
      `,

      html: `
        <h2>Booking Confirmed 🎉</h2>

        <p>Hello <strong>${user.name}</strong>,</p>

        <p>Your equipment rental booking has been confirmed.</p>

        <h3>Booking Details</h3>

        <ul>
    
          <li><strong>Equipment:</strong> ${equipment.name}</li>
          <li><strong>Quantity:</strong> ${booking.quantity}</li>
          <li><strong>Price:</strong> ${equipment.price}</li>
          <li><strong>Rented From:</strong> ${booking.rentFrom.toLocaleString()}</li>
          <li><strong>Rented To:</strong> ${booking.rentTo.toLocaleString()}</li>
        </ul>

        <p>Thank you for using our Equipment Rental System.</p>
      `,
    });

    logger.info(`Booking confirmation sent to ${user.email}`);
  } catch (error) {
    logger.error(`Failed to send booking confirmation:", ${error}`);
  }
};

export const sendBookingReminder = async ({
  user,
  equipment,
  booking,
}: BookingEmailProps) => {
  try {
    const rentedTo = booking.rentTo.toLocaleString();
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

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: "Reminder: Your rental is about to expire soon",
      text: `
Hello ${user.name},

Your rental for ${equipment.name} is about to expire soon.

Equipment: ${equipment.name}
Quantity: ${booking.quantity}
Rented To: ${rentedTo}
Time remaining: ${remainingString}

Please return the equipment on time or extend your booking if needed.

Thank you for using our Equipment Rental System.
      `,
      html: `
        <h2>Rental Reminder</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Your rented equipment time is about to expire soon.</p>
        <h3>Rental Details</h3>
        <ul>
          <li><strong>Equipment:</strong> ${equipment.name}</li>
          <li><strong>Quantity:</strong> ${booking.quantity}</li>
          <li><strong>Rented To:</strong> ${rentedTo}</li>
          <li><strong>Time remaining:</strong> ${remainingString}</li>
        </ul>
        <p>Please return the equipment on time or contact us to extend your booking.</p>
        <p>Thank you for using our Equipment Rental System.</p>
      `,
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
