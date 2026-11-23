import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tickets } from "./tickets.schema";

export const ticketAuditFieldEnum = pgEnum("ticket_audit_field", [
  "category",
  "priority",
  "status",
  "assigneeId",
]);

export const ticketEvents = pgTable(
  "ticket_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    field: ticketAuditFieldEnum("field").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    actor: varchar("actor", { length: 254 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_ticket_events_ticket_id").on(table.ticketId)],
);