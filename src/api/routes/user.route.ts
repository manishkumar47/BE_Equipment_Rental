import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { updateUserRoleSchema, userSchema } from "../validators/user.schema.js";
import * as userController from "../controller/user.controller.js";
import { isAdmin, auth } from "../../middlewares/auth.middleware.js";
import generalRateLimiter from "../../middlewares/ratelimiter/generalRateLimiter.middleware.js";

const userRouter = Router();

userRouter.get("/me", generalRateLimiter, auth, userController.getProfile);

userRouter.get("/", generalRateLimiter, isAdmin, userController.getAllUsers);

userRouter.get("/:id", generalRateLimiter, isAdmin, userController.getUserById);

userRouter.post(
  "/",
  generalRateLimiter,
  isAdmin,
  validate(userSchema),
  userController.createUser,
);

userRouter.get("/", generalRateLimiter, isAdmin, userController.getAllUsers);

userRouter.patch(
  "/:id/role",
  generalRateLimiter,
  isAdmin,
  validate(updateUserRoleSchema),
  userController.updateUserRole,
);

userRouter.delete(
  "/:id",
  generalRateLimiter,
  isAdmin,
  userController.deleteUser,
);

export default userRouter;
