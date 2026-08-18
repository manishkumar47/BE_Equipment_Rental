import * as equipmentRepository from "./equipment.repository.js";
import { logger } from "../../services/pinoLogger.js";
export const createEquipment = async (data) => {
    const equipment = await equipmentRepository.createEquipment(data);
    return equipment;
};
export const getEquipmentFromId = async (equipmentId) => {
    const equipment = await equipmentRepository.getEquipmentFromId(equipmentId);
    return equipment;
};
export const updateEquipment = async (equipmentId, data) => {
    return equipmentRepository.updateEquipment(equipmentId, data);
};
export const deleteEquipment = async (equipmentId) => {
    return equipmentRepository.deleteEquipment(equipmentId);
};
export const getAllEquipments = async () => {
    const equipments = await equipmentRepository.getAllEquipments();
    return equipments;
};
// export const createBulkEquipments = async (equipments) => {
//   const data = await equipmentRepository.createBulkEquipments(equipments);
//   if (!data) {
//     logger.error("NO DATA !");
//     return;
//   }
//   return data;
// };
//# sourceMappingURL=equipment.service.js.map