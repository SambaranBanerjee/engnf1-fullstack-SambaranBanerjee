import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import type { UserRole } from "../utils/jwt.js";

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthenticated());
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        AppError.forbidden(
          `Requires ${allowedRoles.join(" or ")} role to access this resource`,
        ),
      );
      return;
    }

    next();
  };
}