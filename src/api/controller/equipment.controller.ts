import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../helpers/res.helper.js";
import * as equipmentService from "../../service/equipment.service.js";
import type {
  CreateEquipmentType,
  UpdateEquipmentType,
} from "../../types/equipment.type.js";
import { equipmentCategory } from "../../database/schema/schema.js";
import { logger } from "../../core/pinoLogger.js";

export const createEquipment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = req.body;
    logger.info(`hdhafhsdi----__-_-_-_-${JSON.stringify(body)}`);
    const equipmentToBeCreated: CreateEquipmentType = {
      ...body,
      equipmentCategoryId: body.categoryId,
    };
    logger.info(`--------EQUIMENTTOBECREATE-------${JSON.stringify(equipmentToBeCreated)}`)
    const equipment =
      await equipmentService.createEquipment(equipmentToBeCreated);

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
    const equipments = await equipmentService.getAllEquipmentsWithItemCounts();
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
    const equipment = await equipmentService.getEquipmentByIdWithItemCounts(equipmentId);
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
    const body = req.body;
    const updateData: UpdateEquipmentType = {
      name: body.name,
      description: body.description,
      quantity: body.quantity,
      price: body.price,
      imageUrl: body.imageUrl,
      ...(body.categoryId !== undefined && {
        equipmentCategoryId: Number(body.categoryId),
      }),
    };
    const equipment = await equipmentService.updateEquipment(equipmentId, updateData);

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

export const bulkCreateEquipments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const items: Array<{
      name: string;
      description?: string;
      price: number;
      quantity?: number;
      imageUrl?: string;
      categoryId: number;
    }> = req.body.items;

    const equipmentsToCreate: CreateEquipmentType[] = items.map((item) => ({
      name: item.name,
      description: item.description ?? null,
      price: item.price,
      quantity: item.quantity ?? 0,
      imageUrl: item.imageUrl ?? null,
      equipmentCategoryId: item.categoryId,
    }));

    const created = await equipmentService.bulkCreateEquipments(equipmentsToCreate);

    return successResponse(res, {
      status: 201,
      message: `${created.length} equipment item(s) created successfully!`,
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

