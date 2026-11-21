import dotenv from "dotenv";

// The project's .env wins over inherited shell variables (some shells export PORT=0).
dotenv.config({ override: true });

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return parsed;
}

/**
 * Central place for every environment variable.
 * Nothing else in the codebase should read `process.env` directly.
 */
const clientUrls = (process.env.CLIENT_URL ?? "http://localhost:3000")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  port: readNumber("PORT", 5000),
  mongoUri: process.env.MONGODB_URI ?? "",
  dbName: process.env.DB_NAME ?? "fixmate",
  /** Primary client origin — used for JWT audience and links. */
  clientUrl: clientUrls[0] ?? "http://localhost:3000",
  /** Every allowed client origin (CLIENT_URL accepts a comma-separated list). */
  clientUrls,

  // BetterAuth
  betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? "",
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:5000",

  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",

  // ImgBB
  imgbbApiKey: process.env.IMGBB_API_KEY ?? "",
} as const;
