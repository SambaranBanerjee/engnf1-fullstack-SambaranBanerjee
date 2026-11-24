import { z } from "zod";

export const BOOKING_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

const isoUtcStringSchema = z
  .string()
  .trim()
  .refine((val) => !Number.isNaN(Date.parse(val)), {
    message: "Timestamp must be a valid ISO 8601 UTC date string",
  });

export const createBookingSchema = z.object({
  resourceId: z.string().uuid("Invalid resourceId UUID"),
  startTime: isoUtcStringSchema,
  endTime: isoUtcStringSchema,
  purpose: z
    .string()
    .trim()
    .min(5, "Purpose must be at least 5 characters")
    .max(200, "Purpose must be at most 200 characters"),
  ticketId: z.string().uuid("Invalid ticketId UUID").nullable().optional(),
});

export const rejectBookingSchema = z.object({
  note: z
    .string()
    .trim()
    .min(5, "Rejection note must be at least 5 characters")
    .max(200, "Rejection note must be at most 200 characters"),
});

export const listMyBookingsQuerySchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const listAllBookingsQuerySchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  resourceId: z.string().uuid("Invalid resourceId UUID").optional(),
  from: isoUtcStringSchema.optional(),
  to: isoUtcStringSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export function validateBookingWindow(
  startIso: string,
  endIso: string,
  now: Date = new Date(),
): { startDate: Date; endDate: Date } {
  const startDate = new Date(startIso);
  const endDate = new Date(endIso);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new ValidationWindowError("Invalid startTime or endTime");
  }

  if (endDate.getTime() <= startDate.getTime()) {
    throw new ValidationWindowError("endTime must be after startTime");
  }

  // Must fall on 00 or 30 minutes (UTC) with 0 seconds and 0 milliseconds
  const validGrid = (d: Date) =>
    (d.getUTCMinutes() === 0 || d.getUTCMinutes() === 30) &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0;

  if (!validGrid(startDate) || !validGrid(endDate)) {
    throw new ValidationWindowError(
      "startTime and endTime must be on a 30-minute UTC boundary (:00 or :30) with 0s/0ms",
    );
  }

  const durationMinutes =
    (endDate.getTime() - startDate.getTime()) / (60 * 1000);
  if (durationMinutes < 30 || durationMinutes > 240) {
    throw new ValidationWindowError(
      "Booking duration must be between 30 and 240 minutes inclusive",
    );
  }

  if (startDate.getTime() <= now.getTime()) {
    throw new ValidationWindowError("startTime must be in the future");
  }

  const maxAdvanceMs = 30 * 24 * 60 * 60 * 1000;
  if (startDate.getTime() - now.getTime() > maxAdvanceMs) {
    throw new ValidationWindowError(
      "startTime cannot be more than 30 days in the future",
    );
  }

  return { startDate, endDate };
}

export class ValidationWindowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationWindowError";
  }
}

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type RejectBookingInput = z.infer<typeof rejectBookingSchema>;
export type ListMyBookingsQuery = z.infer<typeof listMyBookingsQuerySchema>;
export type ListAllBookingsQuery = z.infer<typeof listAllBookingsQuerySchema>;