import {
  and,
  asc,
  desc,
  eq,
  ilike,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../../database/connection.js";
import {
  ticketEvents,
  tickets,
  users,
} from "../../database/schema/index.js";
import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "./classifier.js";
import type { ListTicketsQuery } from "./tickets.validation.js";

export type TicketRow = typeof tickets.$inferSelect;
export type TicketEventRow = typeof ticketEvents.$inferSelect;

export interface PaginatedTicketsResult {
  data: TicketRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function findTicketById(id: string): Promise<TicketRow | undefined> {
  const [row] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, id))
    .limit(1);
  return row;
}

export async function findTicketEventsByTicketId(
  ticketId: string,
): Promise<TicketEventRow[]> {
  return db
    .select()
    .from(ticketEvents)
    .where(eq(ticketEvents.ticketId, ticketId))
    .orderBy(desc(ticketEvents.createdAt));
}

export async function findUserIdById(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return Boolean(row);
}

export async function listTicketsPaginated(
  query: ListTicketsQuery,
): Promise<PaginatedTicketsResult> {
  const conditions: SQL[] = [];

  if (query.status) {
    conditions.push(eq(tickets.status, query.status));
  }
  if (query.category) {
    conditions.push(eq(tickets.category, query.category));
  }
  if (query.priority) {
    conditions.push(eq(tickets.priority, query.priority));
  }
  if (query.q && query.q.length > 0) {
    const pattern = `%${query.q}%`;
    const searchCond = or(
      ilike(tickets.subject, pattern),
      ilike(tickets.body, pattern),
    );
    if (searchCond) {
      conditions.push(searchCond);
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumnMap = {
    createdAt: tickets.createdAt,
    updatedAt: tickets.updatedAt,
    priority: tickets.priority,
    status: tickets.status,
    category: tickets.category,
  } as const;

  const sortCol = sortColumnMap[query.sortBy];
  const orderByExpr =
    query.sortOrder === "asc" ? asc(sortCol) : desc(sortCol);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tickets)
    .where(whereClause);

  const total = countRow?.count ?? 0;
  const pageSize = query.limit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const offset = (query.page - 1) * pageSize;

  const rows = await db
    .select()
    .from(tickets)
    .where(whereClause)
    .orderBy(orderByExpr, desc(tickets.id))
    .limit(pageSize)
    .offset(offset);

  return {
    data: rows,
    page: query.page,
    pageSize,
    total,
    totalPages,
  };
}

export async function getTicketStatistics() {
  const allRows = await db
    .select({
      category: tickets.category,
      autoCategory: tickets.autoCategory,
      priority: tickets.priority,
      status: tickets.status,
      isReviewed: tickets.isReviewed,
    })
    .from(tickets);

  const byCategory: Record<TicketCategory, number> = {
    BILLING: 0,
    BUG: 0,
    FEATURE_REQUEST: 0,
    LOGIN: 0,
    DELIVERY: 0,
  };

  const byPriority: Record<TicketPriority, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    URGENT: 0,
  };

  const byStatus: Record<TicketStatus, number> = {
    OPEN: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    CLOSED: 0,
  };

  let reviewedCount = 0;
  let agreedReviewedCount = 0;

  for (const row of allRows) {
    byCategory[row.category] += 1;
    byPriority[row.priority] += 1;
    byStatus[row.status] += 1;

    if (row.isReviewed) {
      reviewedCount += 1;
      if (row.category === row.autoCategory) {
        agreedReviewedCount += 1;
      }
    }
  }

  // Model agreement rate: percentage of reviewed tickets where operational category matches autoCategory
  const modelAgreementRate =
    reviewedCount === 0
      ? 100
      : Number(((agreedReviewedCount / reviewedCount) * 100).toFixed(1));

  return {
    byCategory,
    byPriority,
    byStatus,
    reviewedCount,
    modelAgreementRate,
  };
}