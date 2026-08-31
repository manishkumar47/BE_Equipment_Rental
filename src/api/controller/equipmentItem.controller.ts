import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../helpers/res.helper.js";
import * as equipmentItemService from "../../service/equipmentItem.service.js";
import { AppError } from "../../util/appError.js";

const parseEquipmentId = (req: Request) => {
  const equipmentId = Number(req.params.id);
  if (!equipmentId || Number.isNaN(equipmentId) || equipmentId <= 0) {
    throw new AppError(400, "Invalid equipment ID!");
  }
  return equipmentId;
};

const parseItemId = (req: Request) => {
  const itemId = Number(req.params.itemId);
  if (!itemId || Number.isNaN(itemId) || itemId <= 0) {
    throw new AppError(400, "Invalid equipment item ID!");
  }
  return itemId;
};

export const createEquipmentItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const equipmentId = parseEquipmentId(req);
    const item = await equipmentItemService.createEquipmentItem(equipmentId, req.body);
    return successResponse(res, {
      status: 201,
      message: "Equipment item registered!",
      data: item!,
    });
  } catch (error) {
    return next(error);
  }
};

export const bulkCreateEquipmentItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const equipmentId = parseEquipmentId(req);
    const items = await equipmentItemService.bulkCreateEquipmentItems(
      equipmentId,
      req.body.items,
    );
    return successResponse(res, {
      status: 201,
      message: `${items.length} equipment item(s) registered!`,
      data: items,
    });
  } catch (error) {
    return next(error);
  }
};

export const getEquipmentItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const equipmentId = parseEquipmentId(req);
    const items = await equipmentItemService.getEquipmentItemsByEquipmentId(equipmentId);
    return successResponse(res, {
      status: 200,
      message: "Equipment items fetched!",
      data: items,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateEquipmentItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const equipmentId = parseEquipmentId(req);
    const itemId = parseItemId(req);
    const item = await equipmentItemService.updateEquipmentItem(equipmentId, itemId, req.body);
    return successResponse(res, {
      status: 200,
      message: "Equipment item updated!",
      data: item!,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteEquipmentItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const equipmentId = parseEquipmentId(req);
    const itemId = parseItemId(req);
    await equipmentItemService.deleteEquipmentItem(equipmentId, itemId);
    return successResponse(res, {
      status: 200,
      message: "Equipment item deleted!",
    });
  } catch (error) {
    return next(error);
  }
};
