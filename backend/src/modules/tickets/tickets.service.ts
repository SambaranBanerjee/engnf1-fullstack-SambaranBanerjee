import { eq } from "drizzle-orm";
import { db } from "../../database/connection.js";
import { ticketEvents, tickets } from "../../database/schema/index.js";
import { AppError } from "../../errors/AppError.js";
import {
  findTicketById,
  findTicketEventsByTicketId,
  findUserIdById,
  getTicketStatistics,
  listTicketsPaginated,
  type TicketEventRow,
  type TicketRow,
} from "./tickets.repository.js";
import type { ListTicketsQuery, UpdateTicketInput } from "./tickets.validation.js";

export interface TicketWithEvents {
  ticket: TicketRow;
  events: TicketEventRow[];
}

export async function getTicketsList(query: ListTicketsQuery) {
  return listTicketsPaginated(query);
}

export async function getTicketDetail(id: string): Promise<TicketWithEvents> {
  const ticket = await findTicketById(id);
  if (!ticket) {
    throw AppError.notFound("Ticket not found");
  }

  const events = await findTicketEventsByTicketId(ticket.id);
  return { ticket, events };
}

export async function updateTicketAndLogAudit(
  id: string,
  patch: UpdateTicketInput,
  actorEmail: string,
  customAgentHeader?: string,
): Promise<TicketWithEvents> {
  const existing = await findTicketById(id);
  if (!existing) {
    throw AppError.notFound("Ticket not found");
  }

  if (patch.assigneeId !== undefined && patch.assigneeId !== null) {
    const assigneeExists = await findUserIdById(patch.assigneeId);
    if (!assigneeExists) {
      throw AppError.notFound("Referenced assignee user not found");
    }
  }

  const actor =
    customAgentHeader && customAgentHeader.trim().length > 0
      ? customAgentHeader.trim()
      : actorEmail;

  const auditEntries: Array<{
    field: "category" | "priority" | "status" | "assigneeId";
    oldValue: string | null;
    newValue: string | null;
  }> = [];

  let nextCategory = existing.category;
  let nextIsHumanOverride = existing.isHumanOverride;
  let nextPriority = existing.priority;
  let nextStatus = existing.status;
  let nextAssigneeId = existing.assigneeId;
  let nextIsReviewed = existing.isReviewed;

  if (patch.category !== undefined && patch.category !== existing.category) {
    auditEntries.push({
      field: "category",
      oldValue: existing.category,
      newValue: patch.category,
    });
    nextCategory = patch.category;
    nextIsHumanOverride = true;
    nextIsReviewed = true;
  }

  if (patch.priority !== undefined && patch.priority !== existing.priority) {
    auditEntries.push({
      field: "priority",
      oldValue: existing.priority,
      newValue: patch.priority,
    });
    nextPriority = patch.priority;
  }

  if (patch.status !== undefined && patch.status !== existing.status) {
    auditEntries.push({
      field: "status",
      oldValue: existing.status,
      newValue: patch.status,
    });
    if (existing.status === "OPEN" && patch.status !== "OPEN") {
      nextIsReviewed = true;
    }
    nextStatus = patch.status;
  }

  if (patch.assigneeId !== undefined && patch.assigneeId !== existing.assigneeId) {
    auditEntries.push({
      field: "assigneeId",
      oldValue: existing.assigneeId,
      newValue: patch.assigneeId,
    });
    nextAssigneeId = patch.assigneeId;
  }

  const now = new Date();

  const updatedTicket = await db.transaction(async (tx) => {
    const [saved] = await tx
      .update(tickets)
      .set({
        category: nextCategory,
        isHumanOverride: nextIsHumanOverride,
        priority: nextPriority,
        status: nextStatus,
        assigneeId: nextAssigneeId,
        isReviewed: nextIsReviewed,
        updatedAt: now,
      })
      .where(eq(tickets.id, existing.id))
      .returning();

    for (const entry of auditEntries) {
      await tx.insert(ticketEvents).values({
        ticketId: existing.id,
        field: entry.field,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        actor,
        createdAt: now,
      });
    }

    return saved;
  });

  const events = await findTicketEventsByTicketId(existing.id);
  return { ticket: updatedTicket, events };
}

export async function getStatsSummary() {
  return getTicketStatistics();
}