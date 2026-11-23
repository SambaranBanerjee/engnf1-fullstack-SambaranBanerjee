import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const ticketCategoryEnum = pgEnum("ticket_category", [
  "BILLING",
  "BUG",
  "FEATURE_REQUEST",
  "LOGIN",
  "DELIVERY",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    externalId: varchar("external_id", { length: 120 }).notNull().unique(),
    subject: varchar("subject", { length: 150 }).notNull(),
    body: text("body").notNull(),
    autoCategory: ticketCategoryEnum("auto_category").notNull(),
    category: ticketCategoryEnum("category").notNull(),
    isHumanOverride: boolean("is_human_override").default(false).notNull(),
    priority: ticketPriorityEnum("priority").default("MEDIUM").notNull(),
    status: ticketStatusEnum("status").default("OPEN").notNull(),
    assigneeId: uuid("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    isReviewed: boolean("is_reviewed").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_tickets_status").on(table.status),
    index("idx_tickets_category").on(table.category),
    index("idx_tickets_priority").on(table.priority),
    index("idx_tickets_created_at").on(table.createdAt),
  ],
);