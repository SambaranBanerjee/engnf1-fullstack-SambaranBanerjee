import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const resourceTypeEnum = pgEnum("resource_type", [
  "ROOM",
  "LAB",
  "EQUIPMENT",
]);

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 60 }).notNull(),
    type: resourceTypeEnum("type").notNull(),
    capacity: integer("capacity").notNull(),
    description: varchar("description", { length: 300 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "chk_resources_capacity_range",
      sql`${table.capacity} >= 1 AND ${table.capacity} <= 500`,
    ),
  ],
);