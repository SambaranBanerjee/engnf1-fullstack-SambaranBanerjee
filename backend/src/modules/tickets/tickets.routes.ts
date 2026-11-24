import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  validateBody,
  validatePathId,
  validateQuery,
} from "../../middleware/validateRequest.js";
import {
  getTicketDetailController,
  importTicketsController,
  listTicketsController,
  patchTicketController,
} from "./tickets.controller.js";
import {
  importTicketsBodySchema,
  listTicketsQuerySchema,
  updateTicketBodySchema,
} from "./tickets.validation.js";

export const ticketsRouter = Router();

ticketsRouter.use(authenticate);

ticketsRouter.post(
  "/import",
  validateBody(importTicketsBodySchema),
  importTicketsController,
);
ticketsRouter.get(
  "/",
  validateQuery(listTicketsQuerySchema),
  listTicketsController,
);
ticketsRouter.get(
  "/:id",
  validatePathId("id", "Ticket not found"),
  getTicketDetailController,
);
ticketsRouter.patch(
  "/:id",
  validatePathId("id", "Ticket not found"),
  validateBody(updateTicketBodySchema),
  patchTicketController,
);