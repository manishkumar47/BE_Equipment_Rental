import db from "../../database/db-connection.js";
import { and, asc, count, desc, eq, gt, ilike, or } from "drizzle-orm";
import { equipment } from "../../database/schema/schema.js";
import type { CreateEquipmentType, UpdateEquipmentType } from "../../types/equipment.type.js";

export interface EquipmentListFilters {
  search?: string | undefined;
  categoryId?: number | undefined;
  inStockOnly?: boolean | undefined;
  sortBy?: "name_asc" | "price_asc" | "price_desc" | "stock_desc" | undefined;
}


export const createEquipment = async (data: CreateEquipmentType) => {
  const [created] = await db
    .insert(equipment)
    .values(data as typeof equipment.$inferInsert)
    .returning();
  return created;
};

export const getEquipmentFromId = async (equipmentId: number) => {
  return db.query.equipment.findFirst({
    where: { id: equipmentId, isDeleted: false },
  });
};

export const updateEquipment = async (
  equipmentId: number,
  data: UpdateEquipmentType,
) => {
  const [updated] = await db
    .update(equipment)
    .set(data)
    .where(eq(equipment.id, equipmentId))
    .returning();
  return updated;
};

export const deleteEquipment = async (equipmentId: number) => {
  const [deleted] = await db
    .update(equipment)
    .set({ isDeleted: true, deletedAt: new Date() })
    .where(eq(equipment.id, equipmentId))
    .returning();
  return deleted;
};

export const getAllEquipments = async () => {
  return db.query.equipment.findMany({
    where: { isDeleted: false },
  });
};

/**
 * Paginated equipment listing with optional search/category/stock filters,
 * for the public catalog's infinite scroll and the admin fleet table.
 * Mirrors the pagination pattern used in rentalBooking/return repositories.
 */
export const getEquipmentsPaginated = async (
  page: number,
  limit: number,
  filters: EquipmentListFilters = {},
) => {
  const offset = (page - 1) * limit;
  const { search, categoryId, inStockOnly, sortBy } = filters;

  const baseConditions = [eq(equipment.isDeleted, false)];

  if (search && search.trim()) {
    const searchPattern = `%${search.trim()}%`;
    const searchCondition = or(
      ilike(equipment.name, searchPattern),
      ilike(equipment.description, searchPattern),
    );
    if (searchCondition) {
      baseConditions.push(searchCondition);
    }
  }

  if (categoryId) {
    baseConditions.push(eq(equipment.equipmentCategoryId, categoryId));
  }

  if (inStockOnly) {
    baseConditions.push(gt(equipment.quantity, 0));
  }

  const whereClause = and(...baseConditions);

  const orderBy =
    sortBy === "price_asc"
      ? asc(equipment.price)
      : sortBy === "price_desc"
        ? desc(equipment.price)
        : sortBy === "stock_desc"
          ? desc(equipment.quantity)
          : asc(equipment.name);

  const [data, totalResult] = await Promise.all([
    db
      .select()
      .from(equipment)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(equipment).where(whereClause),
  ]);

  const total = totalResult[0]?.total ?? 0;

  return { data, total };
};

export const bulkCreateEquipments = async (data: CreateEquipmentType[]) => {
  const rows = await db
    .insert(equipment)
    .values(data as (typeof equipment.$inferInsert)[])
    .returning();
  return rows;
};
