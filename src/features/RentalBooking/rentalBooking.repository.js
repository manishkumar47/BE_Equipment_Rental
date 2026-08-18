import db from "../../services/drizzle.js";
import { eq } from "drizzle-orm";
import { rentalBooking } from "../../db/schema.js";
export const createRentalBooking = async (createRentalBookingObject) => {
    const [inserted] = await db
        .insert(rentalBooking)
        .values(createRentalBookingObject)
        .returning();
    const booking = await db.query.rentalBooking.findFirst({
        where: { id: inserted.id },
        with: {
            user: true,
            equipment: true,
        },
    });
    return booking;
};
export const getRentalBookingById = async (bookingId) => {
    return db.query.rentalBooking.findFirst({
        where: { id: bookingId, isDeleted: false },
        with: {
            user: true,
            equipment: true,
        },
    });
};
export const deleteRentalBooking = async (bookingId) => {
    const [deleted] = await db
        .update(rentalBooking)
        .set({ isDeleted: true, deletedAt: new Date() })
        .where(eq(rentalBooking.id, bookingId))
        .returning();
    return deleted;
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
export const markReminderSent = async (bookingId) => {
    const [updated] = await db
        .update(rentalBooking)
        .set({ isReminderSent: true })
        .where(eq(rentalBooking.id, bookingId))
        .returning();
    return updated;
};
//# sourceMappingURL=rentalBooking.repository.js.map