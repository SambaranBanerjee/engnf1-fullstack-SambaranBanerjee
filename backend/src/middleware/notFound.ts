import type { Request, Response } from "express";
import { ERROR_CODES } from "../errors/errorCodes.js";

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: "Requested route not found",
    },
  });
}