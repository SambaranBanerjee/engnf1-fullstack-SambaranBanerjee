import {
  and,
  asc,
  eq,
  gt,
  ilike,
  inArray,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../../database/connection.js";
import { bookings, resources } from "../../database/schema/index.js";
import type {
  CreateResourceInput,
  ListResourcesQuery,
  UpdateResourceInput,
} from "./resources.validation.js";

export type ResourceRow = typeof resources.$inferSelect;

export async function findResourceById(
  id: string,
): Promise<ResourceRow | undefined> {
  const [row] = await db
    .select()
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1);
  return row;
}

export async function findResourceByLowerName(
  name: string,
  excludeId?: string,
): Promise<ResourceRow | undefined> {
  const normalized = name.trim().toLowerCase();
  const cond = excludeId
    ? and(sql`LOWER(${resources.name}) = ${normalized}`, sql`${resources.id} <> ${excludeId}`)
    : sql`LOWER(${resources.name}) = ${normalized}`;

  const [row] = await db.select().from(resources).where(cond).limit(1);
  return row;
}

export async function listResourcesPaginated(
  query: ListResourcesQuery,
  includeInactive: boolean,
) {
  const conditions: SQL[] = [];

  if (!includeInactive) {
    conditions.push(eq(resources.isActive, true));
  }
  if (query.type) {
    conditions.push(eq(resources.type, query.type));
  }
  if (query.minCapacity !== undefined) {
    conditions.push(sql`${resources.capacity} >= ${query.minCapacity}`);
  }
  if (query.search && query.search.length > 0) {
    const pattern = `%${query.search}%`;
    conditions.push(ilike(resources.name, pattern));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(resources)
    .where(whereClause);

  const total = countRow?.count ?? 0;
  const pageSize = query.limit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const offset = (query.page - 1) * pageSize;

  const data = await db
    .select()
    .from(resources)
    .where(whereClause)
    .orderBy(asc(resources.name), asc(resources.id))
    .limit(pageSize)
    .offset(offset);

  return {
    data,
    page: query.page,
    pageSize,
    total,
    totalPages,
  };
}

export async function insertResource(
  input: CreateResourceInput,
): Promise<ResourceRow> {
  const [created] = await db
    .insert(resources)
    .values({
      name: input.name.trim(),
      type: input.type,
      capacity: input.capacity,
      description: input.description ?? null,
      isActive: true,
    })
    .returning();

  return created;
}

export async function updateResourceById(
  id: string,
  input: UpdateResourceInput,
): Promise<ResourceRow | undefined> {
  const patch: Partial<typeof resources.$inferInsert> = {};

  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.type !== undefined) patch.type = input.type;
  if (input.capacity !== undefined) patch.capacity = input.capacity;
  if (input.description !== undefined) patch.description = input.description;
  if (input.isActive !== undefined) patch.isActive = input.isActive;

  const [updated] = await db
    .update(resources)
    .set(patch)
    .where(eq(resources.id, id))
    .returning();

  return updated;
}

export async function findOverlappingActiveBookings(
  resourceId: string,
  fromDate: Date,
  toDate: Date,
) {
  return db
    .select({
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.resourceId, resourceId),
        inArray(bookings.status, ["PENDING", "APPROVED"]),
        lt(bookings.startTime, toDate),
        gt(bookings.endTime, fromDate),
      ),
    )
    .orderBy(asc(bookings.startTime));
}