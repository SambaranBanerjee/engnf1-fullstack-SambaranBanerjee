import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../errors/AppError.js";

function formatErrors(issues: ReadonlyArray<{ message: string }>): string {
  return issues.map((issue) => issue.message).join("; ");
}

function getSingleParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

export function validatePathId(
  paramName = "id",
  notFoundMessage = "Resource not found",
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const rawValue = getSingleParam(req.params[paramName]);
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!rawValue || !uuidRegex.test(rawValue)) {
      next(AppError.notFound(notFoundMessage));
      return;
    }

    next();
  };
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(AppError.badRequest(formatErrors(parsed.error.issues)));
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(AppError.badRequest(formatErrors(parsed.error.issues)));
      return;
    }
    res.locals.validatedQuery = parsed.data;
    next();
  };
}