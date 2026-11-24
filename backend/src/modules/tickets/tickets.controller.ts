import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/AppError.js";
import { importTicketsIdempotently } from "./importer.js";
import {
  getStatsSummary,
  getTicketDetail,
  getTicketsList,
  updateTicketAndLogAudit,
} from "./tickets.service.js";
import type {
  ImportTicketsInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from "./tickets.validation.js";

export async function importTicketsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as ImportTicketsInput;
    const summary = await importTicketsIdempotently(body);
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
}

export async function listTicketsController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = res.locals.validatedQuery as ListTicketsQuery;
    const result = await getTicketsList(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTicketDetailController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      throw AppError.notFound("Ticket not found");
    }
    const detail = await getTicketDetail(id);
    res.status(200).json(detail);
  } catch (err) {
    next(err);
  }
}

export async function patchTicketController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw AppError.unauthenticated();
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      throw AppError.notFound("Ticket not found");
    }
    const patch = req.body as UpdateTicketInput;
    const agentHeader = req.header("X-Agent");

    const updated = await updateTicketAndLogAudit(
      id,
      patch,
      req.user.email,
      agentHeader,
    );
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

export async function getStatsController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await getStatsSummary();
    res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
}