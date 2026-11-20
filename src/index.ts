import { createApp } from "./app.js";
import { closeDatabase, connectToDatabase } from "./config/db.js";
import { env } from "./config/env.js";

async function main(): Promise<void> {
  const app = createApp();

  try {
    await connectToDatabase();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️  MongoDB is not connected: ${message}`);
    console.warn("   The API will start, but database routes will fail until MONGODB_URI is set.");
  }

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
