import { transporter } from "../../services/nodemailer.js";
import { logger } from "../../services/pinoLogger.js";
import { renderEmailTemplate } from "./templateRenderer.js";
export const sendResetPassword = async ({ user, token, }) => {
    try {
        const base = process.env.FRONTEND_URL ||
            process.env.BASE_URL ||
            "http://localhost:3000";
        const resetLink = `${base.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
        const context = { user, token, resetLink };
        const html = await renderEmailTemplate("resetPassword", context);
        const text = await renderEmailTemplate("resetPasswordText", context);
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: user.email,
            subject: "Reset your password",
            text,
            html,
        });
        logger.info(`Reset password email sent to ${user.email}`);
        return true;
    }
    catch (error) {
        logger.error({ err: error }, "Failed to send reset password email");
        return false;
    }
};
export default sendResetPassword;
//# sourceMappingURL=resetPasswordEmail.js.map