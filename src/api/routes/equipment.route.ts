import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { equipmentSchema } from "../validators/equipment.schema.js";
import * as equipmentController from "../controller/equipment.controller.js";


import generalRateLimiter from "../../middlewares/ratelimiter/generalRateLimiter.middleware.js";
import { isAdmin } from "../../middlewares/auth.middleware.js";

const equipmentRouter = Router();
equipmentRouter.post(
  "/",
  isAdmin,
  generalRateLimiter,
  validate(equipmentSchema),
  equipmentController.createEquipment,
);

equipmentRouter.post(
  "/bulk",
  isAdmin,
  generalRateLimiter,
  equipmentController.bulkCreateEquipments,
);

equipmentRouter.get(
  "/",
  generalRateLimiter,
  equipmentController.getAllEquipments,
);

equipmentRouter.get(
  "/:id",
  generalRateLimiter,
  equipmentController.getEquipmentById,
);

equipmentRouter.put(
  "/:id",
  isAdmin,
  generalRateLimiter,
  validate(equipmentSchema.partial()),
  equipmentController.updateEquipment,
);

equipmentRouter.delete(
  "/:id",
  isAdmin,
  generalRateLimiter,
  equipmentController.deleteEquipment,
);

export default equipmentRouter;
