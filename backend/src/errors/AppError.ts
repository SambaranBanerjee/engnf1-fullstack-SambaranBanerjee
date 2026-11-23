import type { ErrorCode } from "./errorCodes.js";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    isOperational = true,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string, code: ErrorCode = "VALIDATION_ERROR") {
    return new AppError(400, code, message);
  }

  static unauthenticated(message = "Authentication required") {
    return new AppError(401, "UNAUTHENTICATED", message);
  }

  static forbidden(message = "You do not have permission to perform this action") {
    return new AppError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Requested resource not found") {
    return new AppError(404, "NOT_FOUND", message);
  }

  static conflict(message: string, code: ErrorCode = "CONFLICT") {
    return new AppError(409, code, message);
  }
}