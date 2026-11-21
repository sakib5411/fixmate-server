import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env.js";
import { auth } from "./lib/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { adminRouter } from "./routes/admin.routes.js";
import { bookingsRouter } from "./routes/bookings.routes.js";
import { paymentsRouter, stripeWebhookHandler } from "./routes/payments.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { servicesRouter } from "./routes/services.routes.js";
import { uploadsRouter } from "./routes/uploads.routes.js";
import { usersRouter } from "./routes/users.routes.js";

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );

  // BetterAuth reads the raw request body, so it must be mounted before express.json().
  app.all("/api/auth/*splat", toNodeHandler(auth));

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
