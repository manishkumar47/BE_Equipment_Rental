import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import db from "../db-connection.js";
import { rentalBookingItem } from "../schema/schema.js";

export const assignItemsToBooking = async (
  rentalBookingId: number,
  equipmentItemIds: number[],
  tx: NodePgDatabase<any>,
) => {
  if (equipmentItemIds.length === 0) return [];
  return tx
    .insert(rentalBookingItem)
    .values(equipmentItemIds.map((equipmentItemId) => ({ rentalBookingId, equipmentItemId })))
    .returning();
};

export const getAssignedItemIds = async (
  rentalBookingId: number,
  tx: NodePgDatabase<any> = db,
) => {
  const rows = await tx
    .select({ equipmentItemId: rentalBookingItem.equipmentItemId })
    .from(rentalBookingItem)
    .where(eq(rentalBookingItem.rentalBookingId, rentalBookingId));
  return rows.map((r) => r.equipmentItemId);
};
