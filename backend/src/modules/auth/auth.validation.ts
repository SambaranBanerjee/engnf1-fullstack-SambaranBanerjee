import { z } from "zod";
import { PASSWORD_REGEX } from "../../utils/password.js";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address")
    .max(254, "Email must be at most 254 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(64, "Password must be at most 64 characters")
    .regex(
      PASSWORD_REGEX,
      "Password must contain at least one letter and one digit",
    ),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address")
    .max(254),
  password: z.string().min(1, "Password is required").max(64),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;