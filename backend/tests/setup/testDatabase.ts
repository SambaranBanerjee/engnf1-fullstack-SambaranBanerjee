import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import * as schema from "../../src/database/schema/index.js";

dotenv.config({ path: ".env" });

const testDbUrl = process.env.TEST_DATABASE_URL;

if (!testDbUrl) {
  throw new Error(
    "TEST_DATABASE_URL must be set in backend/.env or environment to run integration and concurrency tests",
  );
}

process.env.DATABASE_URL = testDbUrl;

const { Pool } = pg;
export const testPool = new Pool({ connectionString: testDbUrl, max: 15 });
export const testDb = drizzle(testPool, { schema });

export async function resetTestDatabase() {
  await testDb.execute(
    sql`TRUNCATE TABLE bookings, ticket_events, tickets, resources, users RESTART IDENTITY CASCADE`,
  );
}

export async function closeTestDatabase() {
  await testPool.end();
}