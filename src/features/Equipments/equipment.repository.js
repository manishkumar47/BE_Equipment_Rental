import db from "../../services/drizzle.js";
import { eq } from "drizzle-orm";
import { equipment } from "../../db/schema.js";
export const createEquipment = async (data) => {
    const [created] = await db.insert(equipment).values(data).returning();
    return created;
};
export const getEquipmentFromId = async (equipmentId) => {
    return db.query.equipment.findFirst({
        where: { id: equipmentId, isDeleted: false },
    });
};
export const updateEquipment = async (equipmentId, data) => {
    const [updated] = await db
        .update(equipment)
        .set(data)
        .where(eq(equipment.id, equipmentId))
        .returning();
    return updated;
};
export const deleteEquipment = async (equipmentId) => {
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
//# sourceMappingURL=equipment.repository.js.map