import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closeDatabasePool, pool } from "./database/connection.js";

const app = createApp();

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`TriageSync backend listening on 0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Closing HTTP server and database pool...`);
  server.close(async () => {
    try {
      await closeDatabasePool();
      console.log("Database pool closed cleanly.");
      process.exit(0);
    } catch (err) {
      console.error("Error during database cleanup:", err instanceof Error ? err.message : "Unknown error");
      process.exit(1);
    }
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

void pool;