// backend/src/modules/resources/resources.routes.ts
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  validateBody,
  validatePathId,
  validateQuery,
} from "../../middleware/validateRequest.js";
import {
  createResourceController,
  getResourceAvailabilityController,
  getResourceController,
  listResourcesController,
  patchResourceController,
} from "./resources.controller.js";
import {
  availabilityQuerySchema,
  createResourceSchema,
  listResourcesQuerySchema,
  updateResourceSchema,
} from "./resources.validation.js";

export const resourcesRouter = Router();

resourcesRouter.use(authenticate);

resourcesRouter.get(
  "/",
  validateQuery(listResourcesQuerySchema),
  listResourcesController,
);
resourcesRouter.get(
  "/:id/availability",
  validatePathId("id", "Resource not found"),
  validateQuery(availabilityQuerySchema),
  getResourceAvailabilityController,
);
resourcesRouter.get(
  "/:id",
  validatePathId("id", "Resource not found"),
  getResourceController,
);
resourcesRouter.post(
  "/",
  authorize("ADMIN"),
  validateBody(createResourceSchema),
  createResourceController,
);
resourcesRouter.patch(
  "/:id",
  authorize("ADMIN"),
  validatePathId("id", "Resource not found"),
  validateBody(updateResourceSchema),
  patchResourceController,
);