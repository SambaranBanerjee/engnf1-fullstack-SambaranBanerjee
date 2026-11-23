import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: ".env" });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_DATABASE_URL: z.string().min(1).optional(),
  TEST_DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:5173"),
  ADMIN_PASSWORD: z.string().min(8).default("Admin@123"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;