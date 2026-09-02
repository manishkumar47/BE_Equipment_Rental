import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import db from "../db-connection.js";
import { equipmentItem, rentalBookingItem } from "../schema/schema.js";
import type { RentalBookingItemCondition } from "../../types/rentalBooking.type.js";

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

/**
 * All units for a booking that have not been returned yet (returnedAt IS
 * NULL) — this is "how many are still with the renter", regardless of
 * whether a return has been requested on them.
 */
export const getOutstandingItems = async (
  rentalBookingId: number,
  tx: NodePgDatabase<any> = db,
) => {
  return tx
    .select({
      id: rentalBookingItem.id,
      equipmentItemId: rentalBookingItem.equipmentItemId,
      returnRequestedAt: rentalBookingItem.returnRequestedAt,
      serialNumber: equipmentItem.serialNumber,
    })
    .from(rentalBookingItem)
    .innerJoin(equipmentItem, eq(rentalBookingItem.equipmentItemId, equipmentItem.id))
    .where(
      and(
        eq(rentalBookingItem.rentalBookingId, rentalBookingId),
        isNull(rentalBookingItem.returnedAt),
      ),
    )
    .orderBy(rentalBookingItem.id);
};

/**
 * The currently pending return group for a booking (items already marked
 * returnRequestedAt but not yet returnedAt). Only one such group can exist
 * per booking at a time — enforced by rentalBooking.status.
 */
export const getPendingReturnItems = async (
  rentalBookingId: number,
  tx: NodePgDatabase<any> = db,
) => {
  return tx
    .select({
      id: rentalBookingItem.id,
      equipmentItemId: rentalBookingItem.equipmentItemId,
      serialNumber: equipmentItem.serialNumber,
    })
    .from(rentalBookingItem)
    .innerJoin(equipmentItem, eq(rentalBookingItem.equipmentItemId, equipmentItem.id))
    .where(
      and(
        eq(rentalBookingItem.rentalBookingId, rentalBookingId),
        sql`${rentalBookingItem.returnRequestedAt} IS NOT NULL`,
        isNull(rentalBookingItem.returnedAt),
      ),
    );
};

/** Batched pending-items lookup for a page of bookings (admin return-requests list). */
export const getPendingReturnItemsForBookings = async (rentalBookingIds: number[]) => {
  if (rentalBookingIds.length === 0) return [];
  return db
    .select({
      rentalBookingId: rentalBookingItem.rentalBookingId,
      id: rentalBookingItem.id,
      equipmentItemId: rentalBookingItem.equipmentItemId,
      serialNumber: equipmentItem.serialNumber,
    })
    .from(rentalBookingItem)
    .innerJoin(equipmentItem, eq(rentalBookingItem.equipmentItemId, equipmentItem.id))
    .where(
      and(
        inArray(rentalBookingItem.rentalBookingId, rentalBookingIds),
        sql`${rentalBookingItem.returnRequestedAt} IS NOT NULL`,
        isNull(rentalBookingItem.returnedAt),
      ),
    );
};

/** Stamp a set of items as "return requested" together, sharing one timestamp. */
export const markItemsReturnRequested = async (
  itemIds: number[],
  requestedAt: Date,
  tx: NodePgDatabase<any> = db,
) => {
  if (itemIds.length === 0) return [];
  return tx
    .update(rentalBookingItem)
    .set({ returnRequestedAt: requestedAt })
    .where(inArray(rentalBookingItem.id, itemIds))
    .returning();
};

/** Reject: clear the pending flag so these items can be requested again later. */
export const clearReturnRequested = async (
  itemIds: number[],
  tx: NodePgDatabase<any> = db,
) => {
  if (itemIds.length === 0) return [];
  return tx
    .update(rentalBookingItem)
    .set({ returnRequestedAt: null })
    .where(inArray(rentalBookingItem.id, itemIds))
    .returning();
};

/** Confirm: stamp each item's final condition/fee/returnedAt individually. */
export const confirmItemReturn = async (
  itemId: number,
  data: { condition: RentalBookingItemCondition; damageFee: number | null },
  returnedAt: Date,
  tx: NodePgDatabase<any>,
) => {
  const [updated] = await tx
    .update(rentalBookingItem)
    .set({
      returnedAt,
      condition: data.condition,
      damageFee: data.damageFee,
    })
    .where(eq(rentalBookingItem.id, itemId))
    .returning();
  return updated;
};

/** How many units of this booking are still outstanding (not yet returned). */
export const countOutstandingItems = async (
  rentalBookingId: number,
  tx: NodePgDatabase<any> = db,
) => {
  const [row] = await tx
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(rentalBookingItem)
    .where(
      and(
        eq(rentalBookingItem.rentalBookingId, rentalBookingId),
        isNull(rentalBookingItem.returnedAt),
      ),
    );
  return row?.count ?? 0;
};
