import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { userSchema } from "../validators/user.schema.js";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signupInitiateSchema,
  signupResendSchema,
  signupVerifySchema,
} from "../validators/auth.schema.js";
import * as authController from "../controller/auth.controller.js";
import * as userController from "../controller/user.controller.js";
import loginRateLimiter from "../../middlewares/ratelimiter/loginRateLimiter.middleware.js";
import registerRateLimiter from "../../middlewares/ratelimiter/registerRateLimiter.middleware.js";
import forgotPasswordRateLimiter from "../../middlewares/ratelimiter/forgotPasswordRateLimiter.middleware.js";
import signupInitiateRateLimiter from "../../middlewares/ratelimiter/signupInitiateRateLimiter.middleware.js";

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
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
authRouter.post(
  "/login",
  loginRateLimiter,
  validate(loginSchema),
  authController.loginUser,
);

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     summary: Create a new user account (Direct)
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
 *     responses:
 *       201:
 *         description: User account created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
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
 * /auth/signup/initiate:
 *   post:
 *     summary: Initiate signup by sending a 4-digit OTP code to the email
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
 *     responses:
 *       200:
 *         description: Verification code sent successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists with this email
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */
authRouter.post(
  "/signup/initiate",
  signupInitiateRateLimiter,
  validate(signupInitiateSchema),
  authController.signupInitiate,
);

/**
 * @openapi
 * /auth/signup/resend:
 *   post:
 *     summary: Resend a 4-digit OTP code for pending signup
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
 *         description: New verification code sent successfully
 *       400:
 *         description: No pending signup verification found
 *       429:
 *         description: Resend cooldown active (wait 2 minutes)
 *       500:
 *         description: Internal server error
 */
authRouter.post(
  "/signup/resend",
  validate(signupResendSchema),
  authController.signupResend,
);

/**
 * @openapi
 * /auth/signup/verify:
 *   post:
 *     summary: Verify 4-digit OTP, create user account, and return login session
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               otp:
 *                 type: string
 *                 example: "1234"
 *     responses:
 *       201:
 *         description: Account created and verified successfully
 *       400:
 *         description: Invalid/expired OTP or too many attempts
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
authRouter.post(
  "/signup/verify",
  validate(signupVerifySchema),
  authController.signupVerify,
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset user password using token
 *     tags: [Auth]
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
 *                 minLength: 8
 *                 example: password1234
 *               token:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Missing or invalid token / validation error
 *       500:
 *         description: Internal server error
 */
authRouter.post(
  "/reset-password",
  validate(resetPasswordSchema),
  authController.resetPassword,
);

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
 *         description: If that email exists, a reset link has been sent.
 *       400:
 *         description: Validation error
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */
authRouter.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

export default authRouter;

