import type { BookingEmailProps } from "../../types/nodemailer.types.js";
export declare const sendBookingComplete: ({ user, equipment, booking, }: BookingEmailProps) => Promise<void>;
export declare const sendBookingReminder: ({ user, equipment, booking, }: BookingEmailProps) => Promise<boolean>;
//# sourceMappingURL=bookingEmail.d.ts.map