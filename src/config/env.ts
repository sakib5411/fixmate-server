import dotenv from "dotenv";

dotenv.config();

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
export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  port: readNumber("PORT", 5000),
  mongoUri: process.env.MONGODB_URI ?? "",
  dbName: process.env.DB_NAME ?? "fixmate",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:3000",

  // BetterAuth
  betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? "",
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:5000",

  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",

  // ImgBB
  imgbbApiKey: process.env.IMGBB_API_KEY ?? "",
} as const;
