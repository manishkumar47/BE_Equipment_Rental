import prismaClient from "../../lib/prisma.js";
import { CreateEquipmentType, UpdateEquipmentType } from "./equipment.type.js";

export const createEquipment = async (equipment: CreateEquipmentType) => {
  return await prismaClient.equipment.create({
    data: equipment,
  });
};

export const getEquipmentFromId = async (equipmentId: number) => {
  return await prismaClient.equipment.findFirst({
    where: { id: equipmentId, isDeleted: false },
  });
};

export const updateEquipment = async (
  equipmentId: number,
  data: UpdateEquipmentType,
) => {
  return await prismaClient.equipment.update({
    where: { id: equipmentId },
    data,
  });
};

export const deleteEquipment = async (equipmentId: number) => {
  return await prismaClient.equipment.update({
    where: { id: equipmentId },
    data: { isDeleted: true, deletedAt: new Date() },
  });
};

export const getAllEquipments = async () => {
  const equipments = await prismaClient.equipment.findMany({
    where: { isDeleted: false },
  });
  return equipments;
};
