import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../helpers/res.helper.js";
import * as equipmentService from "./equipment.service.js";
import { CreateEquipmentType, UpdateEquipmentType } from "./equipment.type.js";

export const createEquipment = async (req: Request, res: Response) => {
  try {
    const body: CreateEquipmentType = req.body;
    const equipment = await equipmentService.createEquipment(body);

    return successResponse(res, {
      status: 201,
      message: "Equipment created!",
      data: equipment,
    });
  } catch (err) {
    return errorResponse(res, 500, "Internal Server Error");
  }
};

export const getAllEquipments = async (_req: Request, res: Response) => {
  try {
    const equipments = await equipmentService.getAllEquipments();
    return successResponse(res, {
      status: 200,
      message: "Equipment fetched!",
      data: equipments,
    });
  } catch (error) {
    return errorResponse(res, 500, "Internal Server Error");
  }
};

export const updateEquipment = async (req: Request, res: Response) => {
  try {
    const equipmentId = Number(req.params.id);
    const body: UpdateEquipmentType = req.body;
    const equipment = await equipmentService.updateEquipment(equipmentId, body);

    return successResponse(res, {
      status: 200,
      message: "Equipment updated!",
      data: equipment,
    });
  } catch (error) {
    return errorResponse(res, 500, "Internal Server Error");
  }
};

export const deleteEquipment = async (req: Request, res: Response) => {
  try {
    const equipmentId = Number(req.params.id);
    await equipmentService.deleteEquipment(equipmentId);

    return successResponse(res, {
      status: 200,
      message: "Equipment deleted!",
    });
  } catch (error) {
    return errorResponse(res, 500, "Internal Server Error");
  }
};
