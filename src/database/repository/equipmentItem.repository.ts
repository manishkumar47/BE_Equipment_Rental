import db from "../db-connection.js";
import { and, eq, inArray, sql } from "drizzle-orm";
import { equipmentItem } from "../schema/schema.js";
import type {
  CreateEquipmentItemType,
  UpdateEquipmentItemType,
} from "../../types/equipmentItem.type.js";

export const createEquipmentItem = async (data: CreateEquipmentItemType) => {
  const [created] = await db
    .insert(equipmentItem)
    .values(data as typeof equipmentItem.$inferInsert)
    .returning();
  return created;
};

export const bulkCreateEquipmentItems = async (data: CreateEquipmentItemType[]) => {
  if (data.length === 0) return [];
  return db
    .insert(equipmentItem)
    .values(data as (typeof equipmentItem.$inferInsert)[])
    .returning();
};

export const getEquipmentItemsByEquipmentId = async (equipmentId: number) => {
  return db
    .select()
    .from(equipmentItem)
    .where(and(eq(equipmentItem.equipmentId, equipmentId), eq(equipmentItem.isDeleted, false)))
    .orderBy(equipmentItem.createdAt);
};

export const getEquipmentItemById = async (itemId: number) => {
  return db.query.equipmentItem.findFirst({
    where: { id: itemId, isDeleted: false },
  });
};

export const findEquipmentItemBySerialNumber = async (serialNumber: string) => {
  return db.query.equipmentItem.findFirst({
    where: { serialNumber },
  });
};

export const updateEquipmentItem = async (
  itemId: number,
  data: UpdateEquipmentItemType,
) => {
  const [updated] = await db
    .update(equipmentItem)
    .set(data)
    .where(eq(equipmentItem.id, itemId))
    .returning();
  return updated;
};

export const softDeleteEquipmentItem = async (itemId: number) => {
  const [deleted] = await db
    .update(equipmentItem)
    .set({ isDeleted: true, deletedAt: new Date() })
    .where(eq(equipmentItem.id, itemId))
    .returning();
  return deleted;
};

/**
 * Batched status counts per equipment, for annotating equipment list/detail
 * responses without an N+1 query. Informational only in Phase 1 — does not
 * feed into the existing quantity-based booking flow.
 */
export const getItemCountsForEquipmentIds = async (equipmentIds: number[]) => {
  if (equipmentIds.length === 0) return [];
  return db
    .select({
      equipmentId: equipmentItem.equipmentId,
      totalItemCount: sql<number>`count(*)`.mapWith(Number),
      availableItemCount: sql<number>`count(*) filter (where ${equipmentItem.status} = 'available')`.mapWith(
        Number,
      ),
    })
    .from(equipmentItem)
    .where(
      and(inArray(equipmentItem.equipmentId, equipmentIds), eq(equipmentItem.isDeleted, false)),
    )
    .groupBy(equipmentItem.equipmentId);
};
