import { z } from "zod";

export const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long!"),
  email: z.string().email("Please provide a valid email address!"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long!"),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["ADMIN", "USER"], {
    message: "Role must be either ADMIN or USER",
  }),
});
