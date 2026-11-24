import { z } from "zod";

export const TICKET_CATEGORIES = [
  "BILLING",
  "BUG",
  "FEATURE_REQUEST",
  "LOGIN",
  "DELIVERY",
] as const;

export const TICKET_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
] as const;

export const TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;

export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid ticket ID format"),
});

export const importTicketItemSchema = z.object({
  externalId: z
    .string()
    .trim()
    .min(1, "externalId is required")
    .max(120, "externalId must be at most 120 characters"),
  subject: z
    .string()
    .trim()
    .min(3, "Subject must be at least 3 characters")
    .max(150, "Subject must be at most 150 characters"),
  body: z
    .string()
    .trim()
    .min(5, "Body must be at least 5 characters")
    .max(2000, "Body must be at most 2000 characters"),
});

export const importTicketsBodySchema = z.object({
  tickets: z
    .array(importTicketItemSchema)
    .min(1, "At least one ticket must be provided")
    .max(200, "Cannot import more than 200 tickets in a single request"),
});

export const listTicketsQuerySchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  category: z.enum(TICKET_CATEGORIES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sortBy: z
    .enum(["createdAt", "updatedAt", "priority", "status", "category"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const updateTicketBodySchema = z
  .object({
    category: z.enum(TICKET_CATEGORIES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    status: z.enum(TICKET_STATUSES).optional(),
    assigneeId: z.string().uuid("Invalid assigneeId UUID").nullable().optional(),
  })
  .refine(
    (data) =>
      data.category !== undefined ||
      data.priority !== undefined ||
      data.status !== undefined ||
      data.assigneeId !== undefined,
    {
      message:
        "At least one of category, priority, status, or assigneeId must be provided",
    },
  );

export type ImportTicketsInput = z.infer<typeof importTicketsBodySchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketBodySchema>;