import * as equipmentRepository from "./equipment.repository.js";
import { CreateEquipmentType, UpdateEquipmentType } from "./equipment.type.js";

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
