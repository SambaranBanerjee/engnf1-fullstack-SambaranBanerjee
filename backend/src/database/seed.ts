import argon2 from "argon2";
import { eq, sql } from "drizzle-orm";
import { env } from "../config/env.js";
import { closeDatabasePool, db } from "./connection.js";
import {
  resources,
  ticketEvents,
  tickets,
  users,
} from "./schema/index.js";

const SEED_USERS = [
  {
    name: "Admin Lead",
    email: "admin@triagesync.test",
    plainPassword: env.ADMIN_PASSWORD,
    role: "ADMIN" as const,
  },
  {
    name: "Agent Demo",
    email: "user@triagesync.test",
    plainPassword: "User@123",
    role: "USER" as const,
  },
];

const SEED_RESOURCES = [
  {
    name: "War Room Alpha",
    type: "ROOM" as const,
    capacity: 12,
    description: "Primary incident triage conference room with dual wall displays.",
    isActive: true,
  },
  {
    name: "Escalation Pod B",
    type: "ROOM" as const,
    capacity: 4,
    description: "Quiet breakout room for customer escalation calls.",
    isActive: true,
  },
  {
    name: "Hardware & Device Lab",
    type: "LAB" as const,
    capacity: 8,
    description: "Cross-platform mobile and embedded reproduction lab.",
    isActive: true,
  },
  {
    name: "Legacy Staging Sandbox",
    type: "LAB" as const,
    capacity: 6,
    description: "Decommissioned staging cluster currently offline for maintenance.",
    isActive: false,
  },
  {
    name: "Network Packet Analyzer Kit",
    type: "EQUIPMENT" as const,
    capacity: 2,
    description: "Portable hardware tap and protocol analyzer for latency diagnostics.",
    isActive: true,
  },
  {
    name: "4K Thermal & Oscilloscope Rig",
    type: "EQUIPMENT" as const,
    capacity: 1,
    description: "Bench diagnostic rig for hardware fault reproduction.",
    isActive: true,
  },
];

const SEED_TICKETS = [
  {
    externalId: "SEED-1001",
    subject: "Duplicate charge on monthly invoice #8841",
    body: "Customer reports two identical card charges for their April subscription invoice.",
    autoCategory: "BILLING" as const,
    category: "BILLING" as const,
    priority: "HIGH" as const,
    status: "IN_PROGRESS" as const,
    isHumanOverride: false,
    isReviewed: true,
    reviewEvent: {
      field: "status" as const,
      oldValue: "OPEN",
      newValue: "IN_PROGRESS",
      actor: "admin@triagesync.test",
    },
  },
  {
    externalId: "SEED-1002",
    subject: "Production checkout API throwing 500 exception",
    body: "Users hit an unhandled 500 crash when submitting international shipping addresses.",
    autoCategory: "BUG" as const,
    category: "BUG" as const,
    priority: "URGENT" as const,
    status: "IN_PROGRESS" as const,
    isHumanOverride: false,
    isReviewed: true,
    reviewEvent: {
      field: "status" as const,
      oldValue: "OPEN",
      newValue: "IN_PROGRESS",
      actor: "user@triagesync.test",
    },
  },
  {
    externalId: "SEED-1003",
    subject: "Locked out after 2FA device reset",
    body: "Enterprise admin cannot sign in because authenticator app tokens are rejected.",
    autoCategory: "LOGIN" as const,
    category: "LOGIN" as const,
    priority: "URGENT" as const,
    status: "RESOLVED" as const,
    isHumanOverride: false,
    isReviewed: true,
    reviewEvent: {
      field: "status" as const,
      oldValue: "OPEN",
      newValue: "RESOLVED",
      actor: "admin@triagesync.test",
    },
  },
  {
    externalId: "SEED-1004",
    subject: "Refund requested for broken webhook delivery",
    body: "Classifier tagged billing due to refund keyword, but root cause is webhook payload bug.",
    autoCategory: "BILLING" as const,
    category: "BUG" as const,
    priority: "HIGH" as const,
    status: "OPEN" as const,
    isHumanOverride: true,
    isReviewed: true,
    reviewEvent: {
      field: "category" as const,
      oldValue: "BILLING",
      newValue: "BUG",
      actor: "admin@triagesync.test",
    },
  },
  {
    externalId: "SEED-1005",
    subject: "XSS payload probe <script>alert('xss')</script>",
    body: "Testing raw HTML sanitization: <img src=x onerror=alert(document.domain)> <b>bold</b>",
    autoCategory: "BUG" as const,
    category: "BUG" as const,
    priority: "MEDIUM" as const,
    status: "OPEN" as const,
    isHumanOverride: false,
    isReviewed: false,
  },
  {
    externalId: "SEED-1006",
    subject: "My package has not arrived after 10 business days",
    body: "Tracking number shows label created but carrier delivery has not updated.",
    autoCategory: "DELIVERY" as const,
    category: "DELIVERY" as const,
    priority: "HIGH" as const,
    status: "OPEN" as const,
    isHumanOverride: false,
    isReviewed: false,
  },
  {
    externalId: "SEED-1007",
    subject: "Add CSV export to weekly audit report",
    body: "Compliance team would like a one-click CSV download option on the dashboard.",
    autoCategory: "FEATURE_REQUEST" as const,
    category: "FEATURE_REQUEST" as const,
    priority: "LOW" as const,
    status: "OPEN" as const,
    isHumanOverride: false,
    isReviewed: false,
  },
  {
    externalId: "SEED-1008",
    subject: "Password reset email link expires immediately",
    body: "Clicking the password recovery link shows token expired even within 1 minute.",
    autoCategory: "LOGIN" as const,
    category: "LOGIN" as const,
    priority: "HIGH" as const,
    status: "OPEN" as const,
    isHumanOverride: false,
    isReviewed: false,
  },
  {
    externalId: "SEED-1009",
    subject: "Carrier tracking link returns 404 for express order",
    body: "Customer clicked the shipping notification email and cannot view package status.",
    autoCategory: "DELIVERY" as const,
    category: "DELIVERY" as const,
    priority: "MEDIUM" as const,
    status: "OPEN" as const,
    isHumanOverride: false,
    isReviewed: false,
  },
  {
    externalId: "SEED-1010",
    subject: "Update VAT tax ID on annual enterprise invoice",
    body: "Need a revised PDF invoice reflecting our updated European VAT registration number.",
    autoCategory: "BILLING" as const,
    category: "BILLING" as const,
    priority: "LOW" as const,
    status: "OPEN" as const,
    isHumanOverride: false,
    isReviewed: false,
  },
  {
    externalId: "SEED-1011",
    subject: "Dark mode contrast issue in settings sidebar",
    body: "Secondary labels in account preferences are hard to read on low-brightness monitors.",
    autoCategory: "FEATURE_REQUEST" as const,
    category: "FEATURE_REQUEST" as const,
    priority: "LOW" as const,
    status: "CLOSED" as const,
    isHumanOverride: false,
    isReviewed: false,
  },
  {
    externalId: "SEED-1012",
    subject: "Mobile app crash when uploading large log attachment",
    body: "App closes with out-of-memory error when attaching diagnostic bundles over 25MB.",
    autoCategory: "BUG" as const,
    category: "BUG" as const,
    priority: "HIGH" as const,
    status: "OPEN" as const,
    isHumanOverride: false,
    isReviewed: false,
  },
  {
    externalId: "SEED-1013",
    subject: "SSO SAML login redirects to blank callback page",
    body: "Okta sign in succeeds on IdP side but hangs on the assertion consumer URL.",
    autoCategory: "LOGIN" as const,
    category: "LOGIN" as const,
    priority: "URGENT" as const,
    status: "OPEN" as const,
    isHumanOverride: false,
    isReviewed: false,
  },
  {
    externalId: "SEED-1014",
    subject: "Partial shipment arrived missing hardware mounting kit",
    body: "Main chassis arrived today but accessories box is still marked in transit.",
    autoCategory: "DELIVERY" as const,
    category: "DELIVERY" as const,
    priority: "MEDIUM" as const,
    status: "OPEN" as const,
    isHumanOverride: false,
    isReviewed: false,
  },
  {
    externalId: "SEED-1015",
    subject: "Support custom webhook retry backoff intervals",
    body: "Allow workspace admins to configure exponential retry delays for failed webhooks.",
    autoCategory: "FEATURE_REQUEST" as const,
    category: "FEATURE_REQUEST" as const,
    priority: "MEDIUM" as const,
    status: "OPEN" as const,
    isHumanOverride: false,
    isReviewed: false,
  },
];

async function seed() {
  console.log("Starting idempotent database seed...");

  // 1. Seed Users (case-insensitive email check)
  for (const user of SEED_USERS) {
    const normalizedEmail = user.email.trim().toLowerCase();
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`LOWER(${users.email}) = ${normalizedEmail}`)
      .limit(1);

    if (existing.length === 0) {
      const passwordHash = await argon2.hash(user.plainPassword, {
        type: argon2.argon2id,
      });
      await db.insert(users).values({
        name: user.name,
        email: normalizedEmail,
        passwordHash,
        role: user.role,
      });
      console.log(`Inserted user: ${normalizedEmail} (${user.role})`);
    } else {
      console.log(`Skipped existing user: ${normalizedEmail}`);
    }
  }

  // 2. Seed Resources (case-insensitive name check)
  for (const resource of SEED_RESOURCES) {
    const existing = await db
      .select({ id: resources.id })
      .from(resources)
      .where(sql`LOWER(${resources.name}) = ${resource.name.toLowerCase()}`)
      .limit(1);

    if (existing.length === 0) {
      await db.insert(resources).values(resource);
      console.log(`Inserted resource: ${resource.name} (${resource.type}, active=${resource.isActive})`);
    } else {
      console.log(`Skipped existing resource: ${resource.name}`);
    }
  }

  // 3. Seed Tickets (idempotent on externalId; never overwrites human overrides)
  for (const item of SEED_TICKETS) {
    const existing = await db
      .select()
      .from(tickets)
      .where(eq(tickets.externalId, item.externalId))
      .limit(1);

    if (existing.length === 0) {
      const [inserted] = await db
        .insert(tickets)
        .values({
          externalId: item.externalId,
          subject: item.subject,
          body: item.body,
          autoCategory: item.autoCategory,
          category: item.category,
          isHumanOverride: item.isHumanOverride,
          priority: item.priority,
          status: item.status,
          isReviewed: item.isReviewed,
        })
        .returning({ id: tickets.id });

      if (item.reviewEvent && inserted) {
        await db.insert(ticketEvents).values({
          ticketId: inserted.id,
          field: item.reviewEvent.field,
          oldValue: item.reviewEvent.oldValue,
          newValue: item.reviewEvent.newValue,
          actor: item.reviewEvent.actor,
        });
      }
      console.log(`Inserted ticket: ${item.externalId}`);
    } else {
      console.log(`Skipped existing ticket: ${item.externalId}`);
    }
  }

  console.log("Database seed completed successfully.");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabasePool();
  });