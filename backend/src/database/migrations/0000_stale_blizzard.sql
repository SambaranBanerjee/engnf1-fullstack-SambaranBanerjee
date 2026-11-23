CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN');
--> statement-breakpoint
CREATE TYPE "public"."ticket_category" AS ENUM('BILLING', 'BUG', 'FEATURE_REQUEST', 'LOGIN', 'DELIVERY');
--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');
--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
--> statement-breakpoint
CREATE TYPE "public"."ticket_audit_field" AS ENUM('category', 'priority', 'status', 'assigneeId');
--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('ROOM', 'LAB', 'EQUIPMENT');
--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
--> statement-breakpoint
CREATE TABLE "users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "name" varchar(50) NOT NULL,
    "email" varchar(254) NOT NULL,
    "password_hash" varchar(255) NOT NULL,
    "role" "user_role" DEFAULT 'USER' NOT NULL,
    "created_at" timestamp
    with
        time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "external_id" varchar(120) NOT NULL,
    "subject" varchar(150) NOT NULL,
    "body" text NOT NULL,
    "auto_category" "ticket_category" NOT NULL,
    "category" "ticket_category" NOT NULL,
    "is_human_override" boolean DEFAULT false NOT NULL,
    "priority" "ticket_priority" DEFAULT 'MEDIUM' NOT NULL,
    "status" "ticket_status" DEFAULT 'OPEN' NOT NULL,
    "assignee_id" uuid,
    "is_reviewed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp
    with
        time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp
    with
        time zone DEFAULT now() NOT NULL,
        CONSTRAINT "tickets_external_id_unique" UNIQUE ("external_id")
);
--> statement-breakpoint
CREATE TABLE "ticket_events" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "ticket_id" uuid NOT NULL,
    "field" "ticket_audit_field" NOT NULL,
    "old_value" text,
    "new_value" text,
    "actor" varchar(254) NOT NULL,
    "created_at" timestamp
    with
        time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(60) NOT NULL,
	"type" "resource_type" NOT NULL,
	"capacity" integer NOT NULL,
	"description" varchar(300),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_resources_capacity_range" CHECK ("resources"."capacity" >= 1 AND "resources"."capacity" <= 500)
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"ticket_id" uuid,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"purpose" varchar(200) NOT NULL,
	"status" "booking_status" DEFAULT 'PENDING' NOT NULL,
	"decision_note" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_bookings_time_order" CHECK ("bookings"."end_time" > "bookings"."start_time")
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_tickets_status" ON "tickets" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "idx_tickets_category" ON "tickets" USING btree ("category");
--> statement-breakpoint
CREATE INDEX "idx_tickets_priority" ON "tickets" USING btree ("priority");
--> statement-breakpoint
CREATE INDEX "idx_tickets_created_at" ON "tickets" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "idx_ticket_events_ticket_id" ON "ticket_events" USING btree ("ticket_id");
--> statement-breakpoint
CREATE INDEX "idx_bookings_user_status_start" ON "bookings" USING btree (
    "user_id",
    "status",
    "start_time"
);
--> statement-breakpoint
CREATE INDEX "idx_bookings_resource_time" ON "bookings" USING btree (
    "resource_id",
    "start_time",
    "end_time"
);

-- 1. Enable btree_gist for combining UUID equality (=) with tstzrange overlap (&&)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Enforce case-insensitive uniqueness on user email and resource name
CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_email_lower" ON "users" (LOWER("email"));

CREATE UNIQUE INDEX IF NOT EXISTS "uq_resources_name_lower" ON "resources" (LOWER("name"));

-- 3. Enforce non-overlapping active bookings per resource at the database level
-- Uses half-open interval '[)' so back-to-back bookings (e.g., 10:00-10:30 and 10:30-11:00) succeed.
-- Only PENDING and APPROVED bookings block a slot; REJECTED and CANCELLED free it.
ALTER TABLE "bookings"
ADD CONSTRAINT "excl_bookings_no_resource_overlap" EXCLUDE USING gist (
    "resource_id"
    WITH
        =,
        tstzrange (
            "start_time",
            "end_time",
            '[)'
        )
    WITH
        &&
)
WHERE (
        "status" IN ('PENDING', 'APPROVED')
    );