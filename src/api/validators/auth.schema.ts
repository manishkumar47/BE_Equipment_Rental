import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please provide a valid email address!"),
  password: z
    .string()
    .min(1, "Password is required!")
    .max(72, "Password must be at most 72 characters long!"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please provide a valid email address!"),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "New password must be at least 8 characters long!")
    .max(72, "New password must be at most 72 characters long!"),
  token: z.string().min(1, "Reset token is required!"),
});

export const signupInitiateSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long!")
    .max(100, "Name must be at most 100 characters long!"),
  email: z.string().email("Please provide a valid email address!"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long!")
    .max(72, "Password must be at most 72 characters long!"),
});

export const signupResendSchema = z.object({
  email: z.string().email("Please provide a valid email address!"),
});

export const signupVerifySchema = z.object({
  email: z.string().email("Please provide a valid email address!"),
  otp: z
    .string()
    .length(4, "Verification code must be exactly 4 digits!")
    .regex(/^\d{4}$/, "Verification code must be numeric!"),
});

