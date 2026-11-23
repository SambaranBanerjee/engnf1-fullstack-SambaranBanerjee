import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/AppError.js";
import { getCurrentUser, loginUser, registerUser } from "./auth.service.js";
import { loginSchema, registerSchema } from "./auth.validation.js";

function formatZodIssues(issues: { message: string }[]): string {
  return issues.map((issue) => issue.message).join("; ");
}

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest(formatZodIssues(parsed.error.issues));
    }

    const user = await registerUser(parsed.data);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest(formatZodIssues(parsed.error.issues));
    }

    const result = await loginUser(parsed.data);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function meController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw AppError.unauthenticated();
    }

    const user = await getCurrentUser(req.user.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}