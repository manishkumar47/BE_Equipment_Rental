import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../helpers/res.helper.js";
import * as equipmentService from "./equipment.service.js";
import type { CreateEquipmentType, UpdateEquipmentType } from "./equipment.type.js";
import { equipmentCategory } from "../../db/schema.js";
import { logger } from "../../services/pinoLogger.js";

export const createEquipment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = req.body;
    console.log(`hdhafhsdi----__-_-_-_-${body}`)
    const equipmentToBeCreated: CreateEquipmentType = { ...body, equipmentCategoryId: body.categoryId }
    const equipment = await equipmentService.createEquipment(equipmentToBeCreated);

    return successResponse(res, {
      status: 201,
      message: "Equipment created!",
      data: equipment!,
    });
  } catch (err) {
    next(err);
  }
};

export const getAllEquipments = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const equipments = await equipmentService.getAllEquipments();
    return successResponse(res, {
      status: 200,
      message: "Equipment fetched!",
      data: equipments,
    });
  } catch (error) {
    next(error);
  }
};

export const getEquipmentById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const equipmentId = Number(req.params.id);
    const equipment = await equipmentService.getEquipmentFromId(equipmentId);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found",
        data: null,
      });
    }
    return successResponse(res, {
      status: 200,
      message: "Equipment fetched!",
      data: equipment,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEquipment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const equipmentId = Number(req.params.id);
    const body: UpdateEquipmentType = req.body;
    const equipment = await equipmentService.updateEquipment(equipmentId, body);

    return successResponse(res, {
      status: 200,
      message: "Equipment updated!",
      data: equipment!,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEquipment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const equipmentId = Number(req.params.id);
    await equipmentService.deleteEquipment(equipmentId);

    return successResponse(res, {
      status: 200,
      message: "Equipment deleted!",
    });
  } catch (error) {
    next(error);
  }
};
