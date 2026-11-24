// backend/src/modules/bookings/bookings.controller.ts
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/AppError.js";
import {
  approveBooking,
  cancelBooking,
  createNewBooking,
  getAllBookingsForAdmin,
  getBookingByIdAuthorized,
  getMyBookings,
  rejectBooking,
} from "./bookings.service.js";
import type {
  CreateBookingInput,
  ListAllBookingsQuery,
  ListMyBookingsQuery,
  RejectBookingInput,
} from "./bookings.validation.js";

function extractBookingId(req: Request): string {
  const raw = req.params.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id) throw AppError.notFound("Booking not found");
  return id;
}

export async function createBookingController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const input = req.body as CreateBookingInput;
    const booking = await createNewBooking(req.user.id, input);
    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
}

export async function listMyBookingsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const query = res.locals.validatedQuery as ListMyBookingsQuery;
    const result = await getMyBookings(req.user.id, query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getBookingController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const id = extractBookingId(req);
    const booking = await getBookingByIdAuthorized(
      id,
      req.user.id,
      req.user.role,
    );
    res.status(200).json(booking);
  } catch (err) {
    next(err);
  }
}

export async function listAllBookingsController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = res.locals.validatedQuery as ListAllBookingsQuery;
    const result = await getAllBookingsForAdmin(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function approveBookingController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const id = extractBookingId(req);
    const updated = await approveBooking(id, req.user.id, req.user.role);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

export async function rejectBookingController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const id = extractBookingId(req);
    const { note } = req.body as RejectBookingInput;
    const updated = await rejectBooking(id, note, req.user.id, req.user.role);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

export async function cancelBookingController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const id = extractBookingId(req);
    const updated = await cancelBooking(id, req.user.id, req.user.role);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}