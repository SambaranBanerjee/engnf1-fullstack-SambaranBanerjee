import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: ".env" });

const connectionUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionUrl) {
  throw new Error("DIRECT_DATABASE_URL or DATABASE_URL must be set for Drizzle Kit");
}

export default defineConfig({
  schema: "./src/database/schema/index.ts",
  out: "./src/database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionUrl,
  },
  verbose: true,
  strict: true,
});