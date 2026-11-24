import dotenv from "dotenv";

dotenv.config({ path: ".env" });

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL must be set in backend/.env to run integration and concurrency tests",
  );
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;