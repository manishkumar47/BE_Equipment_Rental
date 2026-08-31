import * as equipmentRepository from "../database/repository/equipment.repository.js";
import * as equipmentItemService from "./equipmentItem.service.js";
import type {
  CreateEquipmentType,
  UpdateEquipmentType,
} from "../types/equipment.type.js";
import { logger } from "../core/pinoLogger.js";

export const createEquipment = async (data: CreateEquipmentType) => {
  const equipment = await equipmentRepository.createEquipment(data);
  return equipment;
};

export const getEquipmentFromId = async (equipmentId: number) => {
  const equipment = await equipmentRepository.getEquipmentFromId(equipmentId);
  return equipment;
};

export const updateEquipment = async (
  equipmentId: number,
  data: UpdateEquipmentType,
) => {
  return equipmentRepository.updateEquipment(equipmentId, data);
};

export const deleteEquipment = async (equipmentId: number) => {
  return equipmentRepository.deleteEquipment(equipmentId);
};

export const getAllEquipments = async () => {
  const equipments = await equipmentRepository.getAllEquipments();
  return equipments;
};

export const bulkCreateEquipments = async (data: CreateEquipmentType[]) => {
  return equipmentRepository.bulkCreateEquipments(data);
};

/**
 * Read-path variants that annotate each equipment with item-derived stock
 * counts (Phase 1 of per-unit tracking). Informational only — `quantity`
 * remains the source of truth for the existing booking flow.
 */
export const getAllEquipmentsWithItemCounts = async () => {
  const equipments = await equipmentRepository.getAllEquipments();
  const counts = await equipmentItemService.getItemCountsMap(equipments.map((e) => e.id));

  return equipments.map((e) => ({
    ...e,
    totalItemCount: counts.get(e.id)?.totalItemCount ?? 0,
    availableItemCount: counts.get(e.id)?.availableItemCount ?? 0,
  }));
};

export const getEquipmentByIdWithItemCounts = async (equipmentId: number) => {
  const equipment = await equipmentRepository.getEquipmentFromId(equipmentId);
  if (!equipment) return equipment;

  const counts = await equipmentItemService.getItemCounts(equipmentId);
  return { ...equipment, ...counts };
};
