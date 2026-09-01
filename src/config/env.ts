import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  PASSWORD_RESET_EXPIRES_MINUTES: z.coerce.number().default(60),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  // Optional: when unset, Sentry error tracking is simply disabled (no-op).
  SENTRY_DSN: z.string().optional(),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error(
      "❌ Invalid environment variables:",
      result.error.flatten().fieldErrors,
    );
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();
