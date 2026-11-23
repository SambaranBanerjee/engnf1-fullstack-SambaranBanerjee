import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { ERROR_CODES } from "../errors/errorCodes.js";

interface PgErrorLike {
  code?: string;
  constraint?: string;
  cause?: PgErrorLike;
}

function extractPgError(err: unknown): PgErrorLike | undefined {
  if (!err || typeof err !== "object") return undefined;
  const candidate = err as PgErrorLike;
  if (candidate.code) return candidate;
  if (candidate.cause?.code) return candidate.cause;
  return undefined;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const pgErr = extractPgError(err);
  if (pgErr?.code === "23505") {
    res.status(409).json({
      error: {
        code: ERROR_CODES.CONFLICT,
        message: "A record with this unique value already exists",
      },
    });
    return;
  }

  if (pgErr?.code === "23P01") {
    res.status(409).json({
      error: {
        code: ERROR_CODES.BOOKING_CONFLICT,
        message: "Booking overlaps with an existing active booking for this resource",
      },
    });
    return;
  }

  console.error(
    "Unhandled application error:",
    err instanceof Error ? err.message : "Unknown error",
  );

  res.status(500).json({
    error: {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: "An unexpected internal error occurred",
    },
  });
}