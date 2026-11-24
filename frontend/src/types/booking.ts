// frontend/src/types/booking.ts
import type { TicketStatsResponse } from "./ticket";
import type { ResourceType } from "./resource";

export type BookingStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface Booking {
  id: string;
  resourceId: string;
  userId: string;
  ticketId: string | null;
  startTime: string;
  endTime: string;
  purpose: string;
  status: BookingStatus;
  decisionNote: string | null;
  createdAt: string;
}

export interface AdminStatsResponse {
  activeResources: number;
  bookingsByStatus: Record<BookingStatus, number>;
  topResources: Array<{
    resourceId: string;
    name: string;
    type: ResourceType;
    bookingCount: number;
  }>;
  ticketStats: TicketStatsResponse;
}