import z from "zod";

export const userSchema = z.object({
  name: z.string().min(3, "Please enter name of length > 2!").optional(),

  email: z.email("Please enter valid email!"),

  password: z.string().min(8, "Password should be of length 8!"),

  role: z.enum(["ADMIN", "USER"]).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["ADMIN", "USER"], {
    message: "Role must be either ADMIN or USER",
  }),
});
