import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env.js";
import { auth } from "./lib/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { adminRouter } from "./routes/admin.routes.js";
import { bookingsRouter } from "./routes/bookings.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { servicesRouter } from "./routes/services.routes.js";

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

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ── Routes ──────────────────────────────────────────────
  app.use("/api/health", healthRouter);
  app.use("/api/services", servicesRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/admin", adminRouter);

  // ── Fallbacks ───────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
