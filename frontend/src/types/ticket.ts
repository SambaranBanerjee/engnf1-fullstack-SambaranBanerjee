export type TicketCategory =
  | "BILLING"
  | "BUG"
  | "FEATURE_REQUEST"
  | "LOGIN"
  | "DELIVERY";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type TicketAuditField = "category" | "priority" | "status" | "assigneeId";

export interface Ticket {
  id: string;
  externalId: string;
  subject: string;
  body: string;
  autoCategory: TicketCategory;
  category: TicketCategory;
  isHumanOverride: boolean;
  priority: TicketPriority;
  status: TicketStatus;
  assigneeId: string | null;
  isReviewed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TicketEvent {
  id: string;
  ticketId: string;
  field: TicketAuditField;
  oldValue: string | null;
  newValue: string | null;
  actor: string;
  createdAt: string;
}

export interface TicketDetailResponse {
  ticket: Ticket;
  events: TicketEvent[];
}

export interface TicketStatsResponse {
  byCategory: Record<TicketCategory, number>;
  byPriority: Record<TicketPriority, number>;
  byStatus: Record<TicketStatus, number>;
  reviewedCount: number;
  modelAgreementRate: number;
}

export interface ImportTicketsResponse {
  importedCount: number;
  updatedCount: number;
  skippedOverrideCount: number;
  total: number;
}

export interface TicketFilters {
  status?: TicketStatus | "";
  category?: TicketCategory | "";
  priority?: TicketPriority | "";
  q?: string;
  page?: number;
  limit?: number;
}