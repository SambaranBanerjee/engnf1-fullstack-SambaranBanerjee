import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { ERROR_CODES } from "../errors/errorCodes.js";

// Stricter rate limit for login and registration endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === "test" ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: "Too many authentication attempts. Please try again later.",
      },
    });
  },
});