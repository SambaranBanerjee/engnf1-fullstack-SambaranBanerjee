import { AppError } from "../../errors/AppError.js";
import { ERROR_CODES } from "../../errors/errorCodes.js";
import type { UserRole } from "../../utils/jwt.js";
import {
  assertCanTransitionBooking,
  type BookingStatus,
} from "./booking-state-machine.js";
import {
  BookingMissingError,
  createBookingWithQuotaAndOverlapGuard,
  findBookingById,
  findResourceExists,
  findTicketExists,
  listAllBookingsAdmin,
  listBookingsForUser,
  QuotaExceededError,
  transitionBookingInTx,
} from "./bookings.repository.js";
import {
  type CreateBookingInput,
  type ListAllBookingsQuery,
  type ListMyBookingsQuery,
  validateBookingWindow,
  ValidationWindowError,
} from "./bookings.validation.js";

function extractPgCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code ?? e.cause?.code;
}

export async function createNewBooking(userId: string, input: CreateBookingInput) {
  const now = new Date();
  let windowDates: { startDate: Date; endDate: Date };

  try {
    windowDates = validateBookingWindow(input.startTime, input.endTime, now);
  } catch (err) {
    if (err instanceof ValidationWindowError) {
      throw AppError.badRequest(err.message);
    }
    throw err;
  }

  const resource = await findResourceExists(input.resourceId);
  if (!resource) {
    throw AppError.notFound("Referenced resource not found");
  }
  if (!resource.isActive) {
    throw AppError.conflict("Cannot book an inactive resource");
  }

  if (input.ticketId) {
    const ticketOk = await findTicketExists(input.ticketId);
    if (!ticketOk) {
      throw AppError.notFound("Referenced ticket not found");
    }
  }

  try {
    return await createBookingWithQuotaAndOverlapGuard({
      userId,
      resourceId: input.resourceId,
      ticketId: input.ticketId ?? null,
      startDate: windowDates.startDate,
      endDate: windowDates.endDate,
      purpose: input.purpose,
      now,
    });
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      throw AppError.conflict(err.message);
    }
    if (extractPgCode(err) === "23P01") {
      throw AppError.conflict(
        "Time slot overlaps with an existing PENDING or APPROVED booking for this resource",
        ERROR_CODES.BOOKING_CONFLICT,
      );
    }
    throw err;
  }
}

export async function getMyBookings(
  userId: string,
  query: ListMyBookingsQuery,
) {
  return listBookingsForUser(userId, query);
}

export async function getBookingByIdAuthorized(
  bookingId: string,
  actorUserId: string,
  actorRole: UserRole,
) {
  const booking = await findBookingById(bookingId);
  if (!booking) {
    throw AppError.notFound("Booking not found");
  }

  if (actorRole !== "ADMIN" && booking.userId !== actorUserId) {
    throw AppError.forbidden("You do not have access to this booking");
  }

  return booking;
}

export async function getAllBookingsForAdmin(query: ListAllBookingsQuery) {
  return listAllBookingsAdmin(query);
}

export async function approveBooking(
  bookingId: string,
  actorUserId: string,
  actorRole: UserRole,
) {
  const now = new Date();
  try {
    return await transitionBookingInTx({
      bookingId,
      nextStatus: "APPROVED",
      decisionNote: null,
      evaluateTransition: (row) => {
        assertCanTransitionBooking({
          currentStatus: row.status as BookingStatus,
          action: "APPROVE",
          actorRole,
          actorUserId,
          bookingOwnerId: row.userId,
          startTime: row.startTime,
          now,
        });
      },
    });
  } catch (err) {
    if (err instanceof BookingMissingError) {
      throw AppError.notFound("Booking not found");
    }
    if (extractPgCode(err) === "23P01") {
      throw AppError.conflict(
        "Approving this booking would overlap with another active booking",
        ERROR_CODES.BOOKING_CONFLICT,
      );
    }
    throw err;
  }
}

export async function rejectBooking(
  bookingId: string,
  note: string,
  actorUserId: string,
  actorRole: UserRole,
) {
  const now = new Date();
  try {
    return await transitionBookingInTx({
      bookingId,
      nextStatus: "REJECTED",
      decisionNote: note.trim(),
      evaluateTransition: (row) => {
        assertCanTransitionBooking({
          currentStatus: row.status as BookingStatus,
          action: "REJECT",
          actorRole,
          actorUserId,
          bookingOwnerId: row.userId,
          startTime: row.startTime,
          now,
        });
      },
    });
  } catch (err) {
    if (err instanceof BookingMissingError) {
      throw AppError.notFound("Booking not found");
    }
    throw err;
  }
}

export async function cancelBooking(
  bookingId: string,
  actorUserId: string,
  actorRole: UserRole,
) {
  const now = new Date();
  try {
    return await transitionBookingInTx({
      bookingId,
      nextStatus: "CANCELLED",
      decisionNote: null,
      evaluateTransition: (row) => {
        assertCanTransitionBooking({
          currentStatus: row.status as BookingStatus,
          action: "CANCEL",
          actorRole,
          actorUserId,
          bookingOwnerId: row.userId,
          startTime: row.startTime,
          now,
        });
      },
    });
  } catch (err) {
    if (err instanceof BookingMissingError) {
      throw AppError.notFound("Booking not found");
    }
    throw err;
  }
}