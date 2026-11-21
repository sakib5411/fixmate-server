// Load the Express `Request.user` type augmentation (see src/types/express.ts).
import "./types/express.js";
import { closeDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { createApp } from "./app.js";

const app = createApp();

/**
 * Vercel zero-config Express: the default export must be the Express app.
 * The DB-ready middleware inside createApp() runs before every request.
 */
export default app;

/** Local development / production Node entry point. */
async function main(): Promise<void> {
  const server = app.listen(env.port, () => {
    console.log(`🚀 FixMate API listening on http://localhost:${env.port}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

if (!process.env.VERCEL) {
  main().catch((error) => {
    console.error("❌ Failed to start the server:", error);
    process.exit(1);
  });
}
