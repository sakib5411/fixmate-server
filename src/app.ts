// Load the Express `Request.user` type augmentation (see src/types/express.ts).
import "./types/express.js";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env.js";
import { connectToDatabase } from "./config/db.js";
import { ensureIndexes } from "./db/collections.js";
import { getAuth } from "./lib/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { adminRouter } from "./routes/admin.routes.js";
import { bookingsRouter } from "./routes/bookings.routes.js";
import { paymentsRouter, stripeWebhookHandler } from "./routes/payments.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { servicesRouter } from "./routes/services.routes.js";
import { uploadsRouter } from "./routes/uploads.routes.js";
import { usersRouter } from "./routes/users.routes.js";

let ready: Promise<void> | null = null;

/** Connects MongoDB once per process before any route touches a collection. */
function ensureReady(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await connectToDatabase();
      await ensureIndexes();
    })().catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      // A comma-separated CLIENT_URL lets production and preview domains coexist.
      origin: env.clientUrls.length ? env.clientUrls : true,
      credentials: true,
    })
  );

  // ── Root Route ──────────────────────────────────────────
  app.get("/", (_req, res) => {
    res.json({
      success: true,
      message: "🚀 FixMate API Server is running successfully!",
      health: "/api/health",
    });
  });

  // Must be registered before all database routes (and before the BetterAuth handler).
  app.use(async (_req, _res, next) => {
    try {
      await ensureReady();
      next();
    } catch (error) {
      next(error);
    }
  });

  // BetterAuth reads the raw request body, so it must be mounted before express.json().
  // getAuth() is lazy because it needs the connected database.
  app.all("/api/auth/*splat", (req, res) => toNodeHandler(getAuth())(req, res));

  // Stripe needs the untouched raw body to verify the webhook signature, so this
  // one route is mounted before express.json().
  app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ── Routes ──────────────────────────────────────────────
  app.use("/api/health", healthRouter);
  app.use("/api/services", servicesRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/admin", adminRouter);

  // ── Fallbacks ───────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
