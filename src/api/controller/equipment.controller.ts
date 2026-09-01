import type { NextFunction, Request, Response } from "express";
import { successResponse, errorResponse } from "../../helpers/res.helper.js";
import * as equipmentService from "../../service/equipment.service.js";
import type {
  CreateEquipmentType,
  UpdateEquipmentType,
} from "../../types/equipment.type.js";
import { equipmentCategory } from "../../database/schema/schema.js";
import { logger } from "../../core/pinoLogger.js";
import { equipmentListQuerySchema } from "../validators/equipment.schema.js";

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

/**
 * GET /equipments — returns the full unpaginated catalog by default
 * (existing consumers: equipment details lookup, admin dashboard stats).
 * When any pagination/filter query param is present, returns the paginated
 * shape instead (consumed by the public catalog's infinite scroll and the
 * admin fleet table).
 */
export const getAllEquipments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const hasListParams = ["page", "limit", "search", "categoryId", "inStockOnly", "sortBy"].some(
      (key) => req.query[key] !== undefined,
    );

    if (hasListParams) {
      const parsed = equipmentListQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return errorResponse(
          res,
          400,
          "Invalid pagination parameters",
          parsed.error.issues.map((issue) => issue.message),
        );
      }

      const { page, limit, search, categoryId, inStockOnly, sortBy } = parsed.data;
      const result = await equipmentService.getEquipmentsPaginated(page, limit, {
        search,
        categoryId,
        inStockOnly,
        sortBy,
      });

      return successResponse(res, {
        status: 200,
        message: "Equipment fetched!",
        data: result,
      });
    }

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

