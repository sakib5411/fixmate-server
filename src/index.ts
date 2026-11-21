// Load the Express `Request.user` type augmentation (see src/types/express.ts).
import "./types/express.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { closeDatabase, connectToDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { ensureIndexes } from "./db/collections.js";

let ready: Promise<void> | null = null;

/** Connects MongoDB once per process, before the Express app is imported. */
function ensureReady(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await connectToDatabase();
      await ensureIndexes();
    })().catch((error: unknown) => {
      // Allow a retry on the next invocation if the first attempt failed.
      ready = null;
      throw error;
    });
  }
  return ready;
}

/**
 * Vercel / serverless entry point. The Express app is a request listener, so it
 * can handle the Node-style req/res objects passed by @vercel/node.
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  await ensureReady();
  const { createApp } = await import("./app.js");
  const app = createApp();

  await new Promise<void>((resolve, reject) => {
    const done = () => resolve();
    res.once("finish", done);
    res.once("close", done);
    try {
      app(req, res);
    } catch (error) {
      reject(error);
    }
  });
}

/** Local development / production Node entry point. */
async function main(): Promise<void> {
  await ensureReady();
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

// On Vercel the default export above is used; don't open a local listener.
if (!process.env.VERCEL) {
  main().catch((error) => {
    console.error("❌ Failed to start the server:", error);
    process.exit(1);
  });
}
