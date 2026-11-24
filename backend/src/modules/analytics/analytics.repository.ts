import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../database/connection.js";
import { bookings, resources } from "../../database/schema/index.js";
import { getTicketStatistics } from "../tickets/tickets.repository.js";
import type { BookingStatus } from "../bookings/booking-state-machine.js";

export async function getAdminStatistics() {
  const [activeResRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(resources)
    .where(eq(resources.isActive, true));

  const statusRows = await db
    .select({
      status: bookings.status,
      count: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .groupBy(bookings.status);

  const bookingsByStatus: Record<BookingStatus, number> = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    CANCELLED: 0,
  };

  for (const row of statusRows) {
    bookingsByStatus[row.status] = row.count;
  }

  const topResourcesRows = await db
    .select({
      resourceId: resources.id,
      name: resources.name,
      type: resources.type,
      bookingCount: sql<number>`count(${bookings.id})::int`,
    })
    .from(resources)
    .leftJoin(bookings, eq(bookings.resourceId, resources.id))
    .groupBy(resources.id, resources.name, resources.type)
    .orderBy(desc(sql`count(${bookings.id})`), desc(resources.name))
    .limit(3);

  const ticketStats = await getTicketStatistics();

  return {
    activeResources: activeResRow?.count ?? 0,
    bookingsByStatus,
    topResources: topResourcesRows,
    ticketStats,
  };
}