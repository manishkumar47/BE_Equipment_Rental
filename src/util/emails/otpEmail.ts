import { transporter } from "../nodemailer.js";
import { logger } from "../../core/pinoLogger.js";
import { renderEmailTemplate } from "./templateRenderer.js";

type UserSimple = { name: string; email: string };

export const sendSignupOtpEmail = async ({
  user,
  otp,
}: {
  user: UserSimple;
  otp: string;
}): Promise<boolean> => {
  try {
    const context = { user, otp };

    const html = await renderEmailTemplate("otpSignup", context);
    const text = await renderEmailTemplate("otpSignupText", context);

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: `${otp} is your EquipFlow verification code`,
      text,
      html,
    });

    logger.info(`Signup OTP email sent to ${user.email}`);
    return true;
  } catch (error) {
    logger.error({ err: error }, `Failed to send signup OTP email to ${user.email}`);
    return false;
  }
};

export default sendSignupOtpEmail;
