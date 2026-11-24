// backend/src/modules/analytics/analytics.routes.ts
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { getAdminStatsController } from "./analytics.controller.js";

export const adminAnalyticsRouter = Router();

adminAnalyticsRouter.use(authenticate, authorize("ADMIN"));
adminAnalyticsRouter.get("/stats", getAdminStatsController);