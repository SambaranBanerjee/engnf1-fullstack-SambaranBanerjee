// backend/src/modules/bookings/bookings.routes.ts
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  validateBody,
  validatePathId,
  validateQuery,
} from "../../middleware/validateRequest.js";
import {
  approveBookingController,
  cancelBookingController,
  createBookingController,
  getBookingController,
  listAllBookingsController,
  listMyBookingsController,
  rejectBookingController,
} from "./bookings.controller.js";
import {
  createBookingSchema,
  listAllBookingsQuerySchema,
  listMyBookingsQuerySchema,
  rejectBookingSchema,
} from "./bookings.validation.js";

export const bookingsRouter = Router();

bookingsRouter.use(authenticate);

// /mine MUST be registered before /:id
bookingsRouter.get(
  "/mine",
  validateQuery(listMyBookingsQuerySchema),
  listMyBookingsController,
);

bookingsRouter.post(
  "/",
  validateBody(createBookingSchema),
  createBookingController,
);

bookingsRouter.get(
  "/",
  authorize("ADMIN"),
  validateQuery(listAllBookingsQuerySchema),
  listAllBookingsController,
);

bookingsRouter.get(
  "/:id",
  validatePathId("id", "Booking not found"),
  getBookingController,
);

bookingsRouter.patch(
  "/:id/cancel",
  validatePathId("id", "Booking not found"),
  cancelBookingController,
);

bookingsRouter.patch(
  "/:id/approve",
  authorize("ADMIN"),
  validatePathId("id", "Booking not found"),
  approveBookingController,
);

bookingsRouter.patch(
  "/:id/reject",
  authorize("ADMIN"),
  validatePathId("id", "Booking not found"),
  validateBody(rejectBookingSchema),
  rejectBookingController,
);