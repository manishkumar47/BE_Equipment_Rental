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

authRouter.post(
  "/login",
  loginRateLimiter,
  validate(loginSchema),
  authController.loginUser,
);

authRouter.post(
  "/signup",
  registerRateLimiter,
  validate(userSchema),
  userController.createUser,
);

authRouter.post(
  "/signup/initiate",
  signupInitiateRateLimiter,
  validate(signupInitiateSchema),
  authController.signupInitiate,
);

authRouter.post(
  "/signup/resend",
  validate(signupResendSchema),
  authController.signupResend,
);

authRouter.post(
  "/signup/verify",
  validate(signupVerifySchema),
  authController.signupVerify,
);

authRouter.post(
  "/reset-password",
  validate(resetPasswordSchema),
  authController.resetPassword,
);

authRouter.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

export default authRouter;

