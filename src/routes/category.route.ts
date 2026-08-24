import { Router } from "express";
import { isAdmin } from "../features/Auth/auth.middleware.js";
import generalRateLimiter from "../middlewares/ratelimiter/generalRateLimiter.middleware.js";
import * as categoryController from "../features/Categories/category.controller.js";
const categoryRouter = Router();

/**
 * @openapi
 * /category/all:
 *   get:
 *     summary: Get all categories (excludes soft-deleted items)
 *     tags: [Category]
 *     responses:
 *       200:
 *         description: Category fetched successfully
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
 *                   example: Cateogories fetched!
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 */

categoryRouter.get(
  "/all",
  generalRateLimiter,
  categoryController.getAllCategories,
);

categoryRouter.get(
  "/",
  generalRateLimiter,
  categoryController.getAllCategories,
);

export default categoryRouter;
