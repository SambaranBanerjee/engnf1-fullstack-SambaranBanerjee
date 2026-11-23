import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Agent"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  // Lightweight health check for Render and smoke tests
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      service: "triagesync-backend",
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler matching standard error contract
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Requested route not found",
      },
    });
  });

  // Centralized error fallback (never leaks stack traces or secrets)
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled application error:", err instanceof Error ? err.message : "Unknown error");
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      },
    });
  });

  return app;
}