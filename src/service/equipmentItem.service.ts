import * as equipmentItemRepository from "../database/repository/equipmentItem.repository.js";
import * as equipmentRepository from "../database/repository/equipment.repository.js";
import { AppError } from "../util/appError.js";
import { isUniqueConstraintViolation } from "../util/dbErrors.js";
import type {
  CreateEquipmentItemType,
  UpdateEquipmentItemType,
} from "../types/equipmentItem.type.js";

const assertEquipmentExists = async (equipmentId: number) => {
  const equipment = await equipmentRepository.getEquipmentFromId(equipmentId);
  if (!equipment) {
    throw new AppError(404, "Equipment not found!");
  }
  return equipment;
};

export const createEquipmentItem = async (
  equipmentId: number,
  data: Omit<CreateEquipmentItemType, "equipmentId">,
) => {
  await assertEquipmentExists(equipmentId);

  try {
    return await equipmentItemRepository.createEquipmentItem({ ...data, equipmentId });
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      throw new AppError(409, `Serial number '${data.serialNumber}' is already in use.`);
    }
    throw err;
  }
};

export const bulkCreateEquipmentItems = async (
  equipmentId: number,
  items: Omit<CreateEquipmentItemType, "equipmentId">[],
) => {
  await assertEquipmentExists(equipmentId);

  try {
    return await equipmentItemRepository.bulkCreateEquipmentItems(
      items.map((item) => ({ ...item, equipmentId })),
    );
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      throw new AppError(409, "One or more serial numbers are already in use.");
    }
    throw err;
  }
};

export const getEquipmentItemsByEquipmentId = async (equipmentId: number) => {
  await assertEquipmentExists(equipmentId);
  return equipmentItemRepository.getEquipmentItemsByEquipmentId(equipmentId);
};

const assertItemBelongsToEquipment = async (equipmentId: number, itemId: number) => {
  const item = await equipmentItemRepository.getEquipmentItemById(itemId);
  if (!item || item.equipmentId !== equipmentId) {
    throw new AppError(404, "Equipment item not found!");
  }
  return item;
};

export const updateEquipmentItem = async (
  equipmentId: number,
  itemId: number,
  data: UpdateEquipmentItemType,
) => {
  await assertItemBelongsToEquipment(equipmentId, itemId);

  try {
    return await equipmentItemRepository.updateEquipmentItem(itemId, data);
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      throw new AppError(409, `Serial number '${data.serialNumber}' is already in use.`);
    }
    throw err;
  }
};

export const deleteEquipmentItem = async (equipmentId: number, itemId: number) => {
  await assertItemBelongsToEquipment(equipmentId, itemId);
  return equipmentItemRepository.softDeleteEquipmentItem(itemId);
};

/** Item-derived counts for a single equipment (used on the equipment detail response). */
export const getItemCounts = async (equipmentId: number) => {
  const [row] = await equipmentItemRepository.getItemCountsForEquipmentIds([equipmentId]);
  return {
    totalItemCount: row?.totalItemCount ?? 0,
    availableItemCount: row?.availableItemCount ?? 0,
  };
};

/** Item-derived counts for many equipment rows at once (used on the equipment list response). */
export const getItemCountsMap = async (equipmentIds: number[]) => {
  const rows = await equipmentItemRepository.getItemCountsForEquipmentIds(equipmentIds);
  const map = new Map<number, { totalItemCount: number; availableItemCount: number }>();
  for (const row of rows) {
    map.set(row.equipmentId, {
      totalItemCount: row.totalItemCount,
      availableItemCount: row.availableItemCount,
    });
  }
  return map;
};
