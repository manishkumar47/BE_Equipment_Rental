import { fine } from "../schema/schema.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export type CreateFineData = {
  rentalBookingId: number;
  userId: number;
  amount: number;
  daysLate: number;
  reason: string;
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
