import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { and, eq, sql } from "drizzle-orm";
import { createApp } from "../../src/app.js";
import { bookings, resources, users } from "../../src/database/schema/index.js";
import { hashPassword } from "../../src/utils/password.js";
import {
  closeTestDatabase,
  resetTestDatabase,
  testDb,
} from "../setup/testDatabase.js";

function nextValidSlot(offsetHoursFromNow: number, durationMinutes = 60) {
  const base = new Date(Date.now() + offsetHoursFromNow * 60 * 60 * 1000);
  // Snap to next 30-minute UTC boundary with 0s/0ms
  base.setUTCSeconds(0, 0);
  const mins = base.getUTCMinutes();
  if (mins > 0 && mins <= 30) {
    base.setUTCMinutes(30);
  } else if (mins > 30) {
    base.setUTCHours(base.getUTCHours() + 1, 0, 0, 0);
  }
  const startTime = base.toISOString();
  const endTime = new Date(
    base.getTime() + durationMinutes * 60 * 1000,
  ).toISOString();
  return { startTime, endTime };
}

describe("Booking Concurrency & User Limit (Real PostgreSQL)", () => {
  const app = createApp();
  let userToken = "";
  let userId = "";
  let resourceId = "";

  beforeAll(async () => {
    await resetTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();

    const [createdUser] = await testDb
      .insert(users)
      .values({
        name: "Concurrent Tester",
        email: "concurrent@triagesync.test",
        passwordHash: await hashPassword("Password123"),
        role: "USER",
      })
      .returning();
    userId = createdUser.id;

    const [createdResource] = await testDb
      .insert(resources)
      .values({
        name: "Concurrency Lab 01",
        type: "LAB",
        capacity: 10,
        description: "Test lab for concurrency verification",
        isActive: true,
      })
      .returning();
    resourceId = createdResource.id;

    const loginRes = await request(app).post("/api/auth/login").send({
      email: "concurrent@triagesync.test",
      password: "Password123",
    });
    expect(loginRes.status).toBe(200); 
    expect(loginRes.body.token).toBeTruthy();
    userToken = loginRes.body.token;
  });

  afterAll(async () => {
    await resetTestDatabase();
    await closeTestDatabase();
  });

  it("allows exactly 1 of 10 simultaneous requests for the same slot and rejects 9 with 409", async () => {
    const { startTime, endTime } = nextValidSlot(48, 60);

    const requests = Array.from({ length: 10 }, (_, idx) =>
      request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          resourceId,
          startTime,
          endTime,
          purpose: `Concurrent diagnostic slot request #${idx + 1}`,
        }),
    );

    const responses = await Promise.all(requests);
    const createdCount = responses.filter((r) => r.status === 201).length;
    const conflictCount = responses.filter((r) => r.status === 409).length;

    expect(createdCount).toBe(1);
    expect(conflictCount).toBe(9);

    const dbActiveRows = await testDb
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.resourceId, resourceId),
          sql`${bookings.status} IN ('PENDING', 'APPROVED')`,
        ),
      );
    expect(dbActiveRows).toHaveLength(1);
  });

  it("enforces max 3 active future bookings per user under concurrent requests", async () => {
    // Prepare 5 distinct non-overlapping slots for the same user concurrently
    const slots = [0, 1, 2, 3, 4].map((i) => nextValidSlot(72 + i * 2, 30));

    const requests = slots.map((slot, idx) =>
      request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          resourceId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          purpose: `Quota test booking #${idx + 1}`,
        }),
    );

    const responses = await Promise.all(requests);
    const unexpected = responses.filter((r) => r.status !== 201 && r.status !== 409);
    if (unexpected.length > 0) {
      console.error(
        "Unexpected booking statuses:",
        unexpected.map((r) => ({ status: r.status, body: r.body })),
      );
    }
    const createdCount = responses.filter((r) => r.status === 201).length;
    const conflictCount = responses.filter((r) => r.status === 409).length;

    expect(createdCount).toBe(3);
    expect(conflictCount).toBe(2);

    const userBookings = await testDb
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId));
    expect(userBookings).toHaveLength(3);
  });
});