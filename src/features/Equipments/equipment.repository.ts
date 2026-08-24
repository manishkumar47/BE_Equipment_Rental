import db from "../../services/drizzle.js";
import { eq } from "drizzle-orm";
import { equipment } from "../../db/schema.js";
import type {
  CreateEquipmentType,
  UpdateEquipmentType,
} from "./equipment.type.js";

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
