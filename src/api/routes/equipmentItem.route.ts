import { Router } from "express";
import { isAdmin } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createEquipmentItemSchema,
  bulkCreateEquipmentItemSchema,
  updateEquipmentItemSchema,
} from "../validators/equipmentItem.schema.js";
import * as equipmentItemController from "../controller/equipmentItem.controller.js";
import generalRateLimiter from "../../middlewares/ratelimiter/generalRateLimiter.middleware.js";

// Nested under /equipments/:id/items — mergeParams so req.params.id (the
// parent equipment id) is visible here. Admin-only: these are internal
// inventory records (serials/asset tags), not customer-facing catalog data.
export const equipmentItemRouter = Router({ mergeParams: true });

equipmentItemRouter.get(
  "/",
  generalRateLimiter,
  isAdmin,
  equipmentItemController.getEquipmentItems,
);

equipmentItemRouter.post(
  "/",
  generalRateLimiter,
  isAdmin,
  validate(createEquipmentItemSchema),
  equipmentItemController.createEquipmentItem,
);

equipmentItemRouter.post(
  "/bulk",
  generalRateLimiter,
  isAdmin,
  validate(bulkCreateEquipmentItemSchema),
  equipmentItemController.bulkCreateEquipmentItems,
);

equipmentItemRouter.patch(
  "/:itemId",
  generalRateLimiter,
  isAdmin,
  validate(updateEquipmentItemSchema),
  equipmentItemController.updateEquipmentItem,
);

equipmentItemRouter.delete(
  "/:itemId",
  generalRateLimiter,
  isAdmin,
  equipmentItemController.deleteEquipmentItem,
);
