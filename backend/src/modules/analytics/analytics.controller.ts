// backend/src/modules/analytics/analytics.controller.ts
import type { NextFunction, Request, Response } from "express";
import { getAdminStatistics } from "./analytics.repository.js";

export async function getAdminStatsController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await getAdminStatistics();
    res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
}