import type { TicketFilters } from "../types/ticket";

export const queryKeys = {
  tickets: {
    all: ["tickets"] as const,
    list: (filters: TicketFilters) => ["tickets", "list", filters] as const,
    detail: (id: string) => ["tickets", "detail", id] as const,
  },
  stats: {
    tickets: ["stats", "tickets"] as const,
    admin: ["stats", "admin"] as const,
  },
  resources: {
    all: ["resources"] as const,
    list: (params: Record<string, unknown>) => ["resources", "list", params] as const,
    detail: (id: string) => ["resources", "detail", id] as const,
    availability: (id: string, from: string, to: string) =>
      ["resources", "availability", id, from, to] as const,
  },
  bookings: {
    all: ["bookings"] as const,
    mine: (params: Record<string, unknown>) => ["bookings", "mine", params] as const,
    adminAll: (params: Record<string, unknown>) => ["bookings", "admin", params] as const,
  },
};