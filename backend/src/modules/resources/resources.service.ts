import { AppError } from "../../errors/AppError.js";
import type { UserRole } from "../../utils/jwt.js";
import {
  findOverlappingActiveBookings,
  findResourceById,
  findResourceByLowerName,
  insertResource,
  listResourcesPaginated,
  updateResourceById,
} from "./resources.repository.js";
import type {
  AvailabilityQuery,
  CreateResourceInput,
  ListResourcesQuery,
  UpdateResourceInput,
} from "./resources.validation.js";

export async function getResourcesList(
  query: ListResourcesQuery,
  role: UserRole,
) {
  const includeInactive = role === "ADMIN";
  return listResourcesPaginated(query, includeInactive);
}

export async function getResourceByIdForRole(id: string, role: UserRole) {
  const resource = await findResourceById(id);
  if (!resource) {
    throw AppError.notFound("Resource not found");
  }

  // Standard USER cannot view inactive resources (treated as 404)
  if (!resource.isActive && role !== "ADMIN") {
    throw AppError.notFound("Resource not found");
  }

  return resource;
}

export async function createNewResource(input: CreateResourceInput) {
  const duplicate = await findResourceByLowerName(input.name);
  if (duplicate) {
    throw AppError.conflict("A resource with this name already exists");
  }

  try {
    return await insertResource(input);
  } catch (err: unknown) {
    const pgErr = err as { code?: string; cause?: { code?: string } };
    if (pgErr?.code === "23505" || pgErr?.cause?.code === "23505") {
      throw AppError.conflict("A resource with this name already exists");
    }
    throw err;
  }
}

export async function updateExistingResource(
  id: string,
  input: UpdateResourceInput,
) {
  const existing = await findResourceById(id);
  if (!existing) {
    throw AppError.notFound("Resource not found");
  }

  if (input.name !== undefined) {
    const duplicate = await findResourceByLowerName(input.name, id);
    if (duplicate) {
      throw AppError.conflict("A resource with this name already exists");
    }
  }

  try {
    const updated = await updateResourceById(id, input);
    if (!updated) {
      throw AppError.notFound("Resource not found");
    }
    return updated;
  } catch (err: unknown) {
    const pgErr = err as { code?: string; cause?: { code?: string } };
    if (pgErr?.code === "23505" || pgErr?.cause?.code === "23505") {
      throw AppError.conflict("A resource with this name already exists");
    }
    throw err;
  }
}

export async function getResourceAvailability(
  id: string,
  role: UserRole,
  query: AvailabilityQuery,
) {
  await getResourceByIdForRole(id, role);

  const fromDate = new Date(query.from);
  const toDate = new Date(query.to);

  const overlapping = await findOverlappingActiveBookings(id, fromDate, toDate);

  return {
    resourceId: id,
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    bookings: overlapping.map((b) => ({
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      status: b.status,
    })),
  };
}