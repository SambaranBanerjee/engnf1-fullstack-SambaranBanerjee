import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";

export type UserRole = "USER" | "ADMIN";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

const ACCESS_TOKEN_EXPIRES_IN = "12h";

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    algorithm: "HS256",
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.sub !== "string" ||
      typeof decoded.email !== "string" ||
      (decoded.role !== "USER" && decoded.role !== "ADMIN")
    ) {
      throw AppError.unauthenticated("Invalid authentication token payload");
    }

    return {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw AppError.unauthenticated("Invalid or expired authentication token");
  }
}