import { z } from "zod";
export const loginSchema = z.object({
    email: z.string().email("Please provide a valid email address!"),
    password: z.string().min(1, "Password is required!"),
});
export const forgotPasswordSchema = z.object({
    email: z.string().email("Please provide a valid email address!"),
});
export const resetPasswordSchema = z.object({
    password: z
        .string()
        .min(8, "New password must be at least 8 characters long!"),
    token: z.string().min(1, "Reset token is required!"),
});
//# sourceMappingURL=auth.schema.js.map