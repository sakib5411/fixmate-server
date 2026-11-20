import { MongoClient, type Db } from "mongodb";
import { env } from "./env.js";

let client: MongoClient | undefined;
let database: Db | undefined;

/**
 * Opens (or reuses) a single MongoDB connection for the whole process.
 */
export async function connectToDatabase(): Promise<Db> {
  if (database) return database;

  if (!env.mongoUri) {
    throw new Error("MONGODB_URI is missing. Add it to your .env file.");
  }

  client = new MongoClient(env.mongoUri);
  await client.connect();

  database = client.db(env.dbName);
  await database.command({ ping: 1 });

  console.log(`✅ MongoDB connected → database "${env.dbName}"`);
  return database;
}

/** Returns the connected database, or throws if `connectToDatabase` was not called. */
export function getDb(): Db {
  if (!database) {
    throw new Error("Database is not connected yet. Call connectToDatabase() first.");
  }
  return database;
}

export function isDatabaseConnected(): boolean {
  return Boolean(database);
}

/** Gracefully closes the connection (used on shutdown). */
export async function closeDatabase(): Promise<void> {
  await client?.close();
  client = undefined;
  database = undefined;
}
