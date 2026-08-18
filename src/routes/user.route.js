import { Router } from "express";
import { validate } from "../middlewares/validate.middleware.js";
import { updateUserRoleSchema, userSchema, } from "../features/Users/user.schema.js";
import * as userController from "../features/Users/user.controller.js";
import { isAdmin } from "../features/Auth/auth.middleware.js";
import generalRateLimiter from "../middlewares/ratelimiter/generalRateLimiter.middleware.js";
const userRouter = Router();
/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Users]
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
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: password123
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
userRouter.post("/", generalRateLimiter, isAdmin, validate(userSchema), userController.createUser);
/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - AuthorizationAuth: []
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
userRouter.get("/", generalRateLimiter, isAdmin, userController.getAllUsers);
/**
 * @openapi
 * /users/{id}/role:
 *   patch:
 *     summary: Update a user's role (Admin only)
 *     tags: [Users]
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
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [ADMIN, USER]
 *                 example: ADMIN
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
userRouter.patch("/:id/role", generalRateLimiter, isAdmin, validate(updateUserRoleSchema), userController.updateUserRole);
/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Soft-delete a user (Admin only)
 *     tags: [Users]
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
 *         description: User soft-deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
userRouter.delete("/:id", generalRateLimiter, isAdmin, userController.deleteUser);
export default userRouter;
//# sourceMappingURL=user.route.js.map