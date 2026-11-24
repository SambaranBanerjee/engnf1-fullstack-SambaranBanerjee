import { AppError } from "../../errors/AppError.js";
import type { UserRole } from "../../utils/jwt.js";

export type BookingStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type BookingAction = "APPROVE" | "REJECT" | "CANCEL";

export function assertCanTransitionBooking(params: {
  currentStatus: BookingStatus;
  action: BookingAction;
  actorRole: UserRole;
  actorUserId: string;
  bookingOwnerId: string;
  startTime: Date;
  now?: Date;
}): BookingStatus {
  const {
    currentStatus,
    action,
    actorRole,
    actorUserId,
    bookingOwnerId,
    startTime,
    now = new Date(),
  } = params;

  // Ownership check before business/lifecycle rules (error precedence step 4)
  if (action === "CANCEL") {
    if (actorUserId !== bookingOwnerId && actorRole !== "ADMIN") {
      throw AppError.forbidden("Only the booking owner can cancel this booking");
    }
  } else {
    if (actorRole !== "ADMIN") {
      throw AppError.forbidden("Only an ADMIN can approve or reject bookings");
    }
  }

  // Transitions/decisions only allowed while startTime is in the future
  if (startTime.getTime() <= now.getTime()) {
    throw AppError.conflict(
      "Booking lifecycle actions are only allowed while startTime is in the future",
    );
  }

  if (action === "APPROVE") {
    if (currentStatus !== "PENDING") {
      throw AppError.conflict(
        `Cannot approve booking in ${currentStatus} status`,
      );
    }
    return "APPROVED";
  }

  if (action === "REJECT") {
    if (currentStatus !== "PENDING") {
      throw AppError.conflict(
        `Cannot reject booking in ${currentStatus} status`,
      );
    }
    return "REJECTED";
  }

  // CANCEL
  if (currentStatus !== "PENDING" && currentStatus !== "APPROVED") {
    throw AppError.conflict(
      `Cannot cancel booking in ${currentStatus} status`,
    );
  }
  return "CANCELLED";
}