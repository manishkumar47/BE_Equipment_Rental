import { Router } from "express";
import { validate } from "../middlewares/validate.middleware.js";
import { userSchema } from "../features/Users/user.schema.js";
import * as authController from "../features/Auth/auth.controller.js";
import * as userController from "../features/Users/user.controller.js";
import loginRateLimiter from "../middlewares/ratelimiter/loginRateLimiter.middleware.js";
import registerRateLimiter from "../middlewares/ratelimiter/registerRateLimiter.middleware.js";
import { auth } from "../Auth/auth.middleware.js";
const authRouter = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: User found and logged in successfully
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
 *                   example: User Found
 *                 data:
 *                   type: object
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
authRouter.post(
  "/login",
  loginRateLimiter,
  validate(userSchema),
  authController.loginUser,
);

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     summary: Create a new user account
 *     tags: [Auth]
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
 *               role:
 *                 type: string
 *                 enum: [ADMIN, USER]
 *                 example: USER
 *     responses:
 *       201:
 *         description: User account created successfully
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
 *                   example: User created!
 *                 data:
 *                   type: object
 *       500:
 *         description: Internal server error
 */
authRouter.post(
  "/signup",
  registerRateLimiter,
  validate(userSchema),
  userController.createUser,
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset user password using token in Authorization header
 *     tags: [Auth]
 *     
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - token
 *             properties:
 *               password:
 *                 type: string
 *                 example: password1234
 *               token:
 *                 type: string
 *                 example: xj73tfb92hjd292dhsixjbgciru389...
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Missing or invalid token / validation error
 *       500:
 *         description: Internal server error
 */
authRouter.post("/reset-password", authController.resetPassword);
/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Send password reset email with a token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: Reset email sent
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
authRouter.post("/forgot-password", auth, authController.forgotPassword);
export default authRouter;
