// Load the Express `Request.user` type augmentation (see src/types/express.ts).
import "./types/express.js";
import { closeDatabase, connectToDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { ensureIndexes } from "./db/collections.js";

async function main(): Promise<void> {
  // The BetterAuth instance needs a live database, so connect first
  // and only then load the Express app.
  await connectToDatabase();
  await ensureIndexes();

  const { createApp } = await import("./app.js");
  const app = createApp();

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

main().catch((error) => {
  console.error("❌ Failed to start the server:", error);
  process.exit(1);
});
