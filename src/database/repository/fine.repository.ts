import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import db from "../db-connection.js";
import { fine, rentalBooking, equipment } from "../schema/schema.js";

export type CreateFineData = {
  rentalBookingId: number;
  userId: number;
  amount: number;
  daysLate: number;
  reason: string;
  dueDate: Date;
};

export const createFine = async (
  data: CreateFineData,
  tx: NodePgDatabase<any>,
) => {
  const [inserted] = await tx
    .insert(fine)
    .values(data)
    .returning();
  return inserted;
};

export const getFinesByUserId = async (userId: number) => {
  return db
    .select({
      fine,
      booking: {
        id: rentalBooking.id,
        rentFrom: rentalBooking.rentFrom,
        rentTo: rentalBooking.rentTo,
      },
      equipment: {
        id: equipment.id,
        name: equipment.name,
        imageUrl: equipment.imageUrl,
      },
    })
    .from(fine)
    .innerJoin(rentalBooking, eq(fine.rentalBookingId, rentalBooking.id))
    .innerJoin(equipment, eq(rentalBooking.equipmentId, equipment.id))
    .where(eq(fine.userId, userId))
    .orderBy(desc(fine.createdAt));
};

export const getFineById = async (fineId: number) => {
  return db.query.fine.findFirst({
    where: { id: fineId },
  });
};

/** Conditional WHERE guards against double-pay races. */
export const markFinePaid = async (fineId: number) => {
  const [updated] = await db
    .update(fine)
    .set({ status: "paid", resolvedAt: new Date() })
    .where(and(eq(fine.id, fineId), eq(fine.status, "unpaid")))
    .returning();
  return updated;
};
