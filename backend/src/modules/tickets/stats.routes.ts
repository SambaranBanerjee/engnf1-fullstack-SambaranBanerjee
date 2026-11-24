import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { getStatsController } from "./tickets.controller.js";

export const statsRouter = Router();

statsRouter.use(authenticate);
statsRouter.get("/", getStatsController);