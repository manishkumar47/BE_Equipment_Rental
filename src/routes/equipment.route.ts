import { Router } from "express";
import { validate } from "../middlewares/validate.middleware.js";
import { equipmentSchema } from "../features/Equipments/equipment.schema.js";
import * as equipmentController from "../features/Equipments/equipment.controller.js";
import { isAdmin } from "../features/Auth/auth.middleware.js";
import generalRateLimiter from "../middlewares/ratelimiter/generalRateLimiter.middleware.js";

const equipmentRouter = Router();
/**
 * @openapi
 * /equipments:
 *   post:
 *     summary: Create a new equipment item
 *     tags: [Equipment]
 *     security:
 *       - AuthorizationAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 example: Laptop
 *               description:
 *                 type: string
 *                 example: Dell Inspiron laptop
 *               quantity:
 *                 type: integer
 *                 example: 5
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 1000.0
 *     responses:
 *       201:
 *         description: Equipment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Equipment created!
 *                 data:
 *                   type: object
 *       500:
 *         description: Internal server error
 */
equipmentRouter.post(
  "/",
  isAdmin,
  generalRateLimiter,
  validate(equipmentSchema),
  equipmentController.createEquipment,
);

/**
 * @openapi
 * /equipments:
 *   get:
 *     summary: Get all equipment items (excludes soft-deleted items)
 *     tags: [Equipment]
 *     responses:
 *       200:
 *         description: Equipment fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Equipment fetched!
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 */
equipmentRouter.get(
  "/",
  generalRateLimiter,
  equipmentController.getAllEquipments,
);

/**
 * @openapi
 * /equipments/{id}:
 *   put:
 *     summary: Update an equipment item
 *     tags: [Equipment]
 *     security:
 *       - AuthorizationAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Laptop
 *               description:
 *                 type: string
 *                 example: Dell Inspiron laptop
 *               quantity:
 *                 type: integer
 *                 example: 5
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 1000.0
 *     responses:
 *       200:
 *         description: Equipment updated successfully
 *       500:
 *         description: Internal server error
 */
equipmentRouter.put(
  "/:id",
  isAdmin,
  generalRateLimiter,
  validate(equipmentSchema.partial()),
  equipmentController.updateEquipment,
);

/**
 * @openapi
 * /equipments/{id}:
 *   delete:
 *     summary: Soft-delete an equipment item (admin only)
 *     tags: [Equipment]
 *     security:
 *       - AuthorizationAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Equipment soft-deleted successfully
 *       500:
 *         description: Internal server error
 */
equipmentRouter.delete(
  "/:id",
  isAdmin,
  generalRateLimiter,
  equipmentController.deleteEquipment,
);

export default equipmentRouter;
