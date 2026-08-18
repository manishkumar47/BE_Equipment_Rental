import { successResponse } from "../../helpers/res.helper.js";
import * as equipmentService from "./equipment.service.js";
export const createEquipment = async (req, res, next) => {
    try {
        const body = req.body;
        const equipment = await equipmentService.createEquipment(body);
        return successResponse(res, {
            status: 201,
            message: "Equipment created!",
            data: equipment,
        });
    }
    catch (err) {
        next(err);
    }
};
export const getAllEquipments = async (_req, res, next) => {
    try {
        const equipments = await equipmentService.getAllEquipments();
        return successResponse(res, {
            status: 200,
            message: "Equipment fetched!",
            data: equipments,
        });
    }
    catch (error) {
        next(error);
    }
};
export const updateEquipment = async (req, res, next) => {
    try {
        const equipmentId = Number(req.params.id);
        const body = req.body;
        const equipment = await equipmentService.updateEquipment(equipmentId, body);
        return successResponse(res, {
            status: 200,
            message: "Equipment updated!",
            data: equipment,
        });
    }
    catch (error) {
        next(error);
    }
};
export const deleteEquipment = async (req, res, next) => {
    try {
        const equipmentId = Number(req.params.id);
        await equipmentService.deleteEquipment(equipmentId);
        return successResponse(res, {
            status: 200,
            message: "Equipment deleted!",
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=equipment.controller.js.map