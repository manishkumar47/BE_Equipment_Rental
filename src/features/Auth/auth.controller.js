import { successResponse } from "../../helpers/res.helper.js";
import * as authService from "./auth.service.js";
import { sendResetPassword } from "../../lib/emails/resetPasswordEmail.js";
import { hashpassword } from "../../helpers/bcrypt.helper.js";
import { AppError } from "../../utils/appError.js";
export const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await authService.findUserByEmailAndPassword(email, password);
        if (!user) {
            throw new AppError(404, "Can't find user");
        }
        const userTokenPayload = {
            id: user.id,
            email,
            role: user.role,
        };
        const token = await authService.createUserToken({ userTokenPayload });
        if (!token) {
            throw new AppError(500, "Token not generated! Please login again!");
        }
        return successResponse(res, {
            status: 200,
            message: "User Found",
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token,
            },
        });
    }
    catch (error) {
        return next(error);
    }
};
export const resetPassword = async (req, res, next) => {
    try {
        const { password, token } = req.body;
        if (!token)
            throw new AppError(400, "No token provided in headers");
        if (!password)
            throw new AppError(400, "New password is required");
        const payload = await authService.verifyPasswordResetToken(token);
        if (!payload || !payload.email) {
            throw new AppError(400, "Invalid or expired token");
        }
        const hashed = await hashpassword(password);
        await authService.updateUserPassword(payload.email, hashed);
        await authService.markPasswordResetUsed(payload.id);
        return successResponse(res, { status: 200, message: "Password updated" });
    }
    catch (error) {
        return next(error);
    }
};
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email)
            throw new AppError(400, "Email is required");
        const user = await authService.findUserByEmail(email);
        const token = await authService.createPasswordResetToken(email);
        const sent = await sendResetPassword({
            user: { name: user.name, email: user.email },
            token,
        });
        if (!sent)
            throw new AppError(500, "Failed to send reset email");
        return successResponse(res, { status: 200, message: "Reset email sent" });
    }
    catch (error) {
        return next(error);
    }
};
//# sourceMappingURL=auth.controller.js.map