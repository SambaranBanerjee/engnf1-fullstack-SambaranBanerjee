// backend/src/modules/resources/resources.controller.ts
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/AppError.js";
import {
  createNewResource,
  getResourceAvailability,
  getResourceByIdForRole,
  getResourcesList,
  updateExistingResource,
} from "./resources.service.js";
import type {
  AvailabilityQuery,
  CreateResourceInput,
  ListResourcesQuery,
  UpdateResourceInput,
} from "./resources.validation.js";

function extractId(req: Request): string {
  const raw = req.params.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id) throw AppError.notFound("Resource not found");
  return id;
}

export async function listResourcesController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const query = res.locals.validatedQuery as ListResourcesQuery;
    const result = await getResourcesList(query, req.user.role);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getResourceController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const id = extractId(req);
    const resource = await getResourceByIdForRole(id, req.user.role);
    res.status(200).json(resource);
  } catch (err) {
    next(err);
  }
}

export async function createResourceController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as CreateResourceInput;
    const created = await createNewResource(input);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

export async function patchResourceController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = extractId(req);
    const input = req.body as UpdateResourceInput;
    const updated = await updateExistingResource(id, input);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

export async function getResourceAvailabilityController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const id = extractId(req);
    const query = res.locals.validatedQuery as AvailabilityQuery;
    const availability = await getResourceAvailability(id, req.user.role, query);
    res.status(200).json(availability);
  } catch (err) {
    next(err);
  }
}