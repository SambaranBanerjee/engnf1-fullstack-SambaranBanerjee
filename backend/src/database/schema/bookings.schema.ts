import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { resources } from "./resources.schema";
import { tickets } from "./tickets.schema";
import { users } from "./users.schema";

export const bookingStatusEnum = pgEnum("booking_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ticketId: uuid("ticket_id").references(() => tickets.id, {
      onDelete: "set null",
    }),
    startTime: timestamp("start_time", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    endTime: timestamp("end_time", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    purpose: varchar("purpose", { length: 200 }).notNull(),
    status: bookingStatusEnum("status").default("PENDING").notNull(),
    decisionNote: varchar("decision_note", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "chk_bookings_time_order",
      sql`${table.endTime} > ${table.startTime}`,
    ),
    index("idx_bookings_user_status_start").on(
      table.userId,
      table.status,
      table.startTime,
    ),
    index("idx_bookings_resource_time").on(
      table.resourceId,
      table.startTime,
      table.endTime,
    ),
  ],
);