import {
  and,
  desc,
  eq,
  gt,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../../database/connection.js";
import {
  bookings,
  resources,
  tickets,
  users,
} from "../../database/schema/index.js";
import type {
  ListAllBookingsQuery,
  ListMyBookingsQuery,
} from "./bookings.validation.js";

export type BookingRow = typeof bookings.$inferSelect;

export async function findBookingById(
  id: string,
): Promise<BookingRow | undefined> {
  const [row] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  return row;
}

export async function findResourceExists(resourceId: string) {
  const [row] = await db
    .select({ id: resources.id, isActive: resources.isActive })
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1);
  return row;
}

export async function findTicketExists(ticketId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  return Boolean(row);
}

export async function listBookingsForUser(
  userId: string,
  query: ListMyBookingsQuery,
) {
  const conditions: SQL[] = [eq(bookings.userId, userId)];
  if (query.status) {
    conditions.push(eq(bookings.status, query.status));
  }
  const whereClause = and(...conditions);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(whereClause);

  const total = countRow?.count ?? 0;
  const pageSize = query.limit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const offset = (query.page - 1) * pageSize;

  const data = await db
    .select()
    .from(bookings)
    .where(whereClause)
    .orderBy(desc(bookings.startTime), desc(bookings.id))
    .limit(pageSize)
    .offset(offset);

  return { data, page: query.page, pageSize, total, totalPages };
}

export async function listAllBookingsAdmin(query: ListAllBookingsQuery) {
  const conditions: SQL[] = [];

  if (query.status) {
    conditions.push(eq(bookings.status, query.status));
  }
  if (query.resourceId) {
    conditions.push(eq(bookings.resourceId, query.resourceId));
  }
  // Overlapping range when from/to provided
  if (query.from) {
    conditions.push(gt(bookings.endTime, new Date(query.from)));
  }
  if (query.to) {
    conditions.push(lt(bookings.startTime, new Date(query.to)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(whereClause);

  const total = countRow?.count ?? 0;
  const pageSize = query.limit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const offset = (query.page - 1) * pageSize;

  const data = await db
    .select()
    .from(bookings)
    .where(whereClause)
    .orderBy(desc(bookings.startTime), desc(bookings.id))
    .limit(pageSize)
    .offset(offset);

  return { data, page: query.page, pageSize, total, totalPages };
}

export async function createBookingWithQuotaAndOverlapGuard(params: {
  userId: string;
  resourceId: string;
  ticketId: string | null;
  startDate: Date;
  endDate: Date;
  purpose: string;
  now?: Date;
}): Promise<BookingRow> {
  const now = params.now ?? new Date();

  return db.transaction(async (tx) => {
    // 1. Lock user row to serialize concurrent bookings by the same user
    await tx.execute(sql`SELECT ${users.id} FROM ${users} WHERE ${users.id} = ${params.userId} FOR UPDATE`);

    // 2. Count future PENDING and APPROVED bookings for this user
    const [quotaRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(
        and(
          eq(bookings.userId, params.userId),
          sql`${bookings.status} IN ('PENDING', 'APPROVED')`,
          gt(bookings.startTime, now),
        ),
      );

    const activeFutureCount = quotaRow?.count ?? 0;
    if (activeFutureCount >= 3) {
      throw new QuotaExceededError();
    }

    // 3. Insert PENDING booking; exclusion constraint 'excl_bookings_no_resource_overlap'
    //    atomically rejects overlapping PENDING/APPROVED slots with SQLSTATE 23P01.
    const [created] = await tx
      .insert(bookings)
      .values({
        resourceId: params.resourceId,
        userId: params.userId,
        ticketId: params.ticketId,
        startTime: params.startDate,
        endTime: params.endDate,
        purpose: params.purpose.trim(),
        status: "PENDING",
        decisionNote: null,
      })
      .returning();

    return created;
  });
}

export async function transitionBookingInTx(params: {
  bookingId: string;
  nextStatus: "APPROVED" | "REJECTED" | "CANCELLED";
  decisionNote: string | null;
  evaluateTransition: (lockedRow: BookingRow) => void;
}): Promise<BookingRow> {
  return db.transaction(async (tx) => {
    const lockedResult = await tx.execute<BookingRow>(
      sql`SELECT * FROM ${bookings} WHERE ${bookings.id} = ${params.bookingId} FOR UPDATE`,
    );
    const lockedRow = lockedResult.rows[0];
    if (!lockedRow) {
      throw new BookingMissingError();
    }

    // Normalize timestamp fields from raw SQL row
    const normalizedRow: BookingRow = {
      ...lockedRow,
      startTime: new Date(lockedRow.startTime),
      endTime: new Date(lockedRow.endTime),
      createdAt: new Date(lockedRow.createdAt),
    };

    params.evaluateTransition(normalizedRow);

    const [updated] = await tx
      .update(bookings)
      .set({
        status: params.nextStatus,
        decisionNote: params.decisionNote,
      })
      .where(eq(bookings.id, params.bookingId))
      .returning();

    return updated;
  });
}

export class QuotaExceededError extends Error {
  constructor() {
    super("User cannot have more than 3 active future bookings");
    this.name = "QuotaExceededError";
  }
}

export class BookingMissingError extends Error {
  constructor() {
    super("Booking not found");
    this.name = "BookingMissingError";
  }
}