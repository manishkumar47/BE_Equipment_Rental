import * as equipmentRepository from "../database/repository/equipment.repository.js";
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
