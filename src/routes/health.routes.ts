import { Router } from "express";
import { isDatabaseConnected } from "../config/db.js";

export const healthRouter = Router();

/**
 * GET /api/health
 * Simple check used by deployment platforms and during development.
 */
healthRouter.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "FixMate API is running",
    database: isDatabaseConnected() ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});
