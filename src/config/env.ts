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
const defaultClientUrls = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://fixmate-sandy.vercel.app",
];

const parsedClientUrls = (process.env.CLIENT_URL ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const clientUrls = parsedClientUrls.length ? parsedClientUrls : defaultClientUrls;

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "production",
  isProduction: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
  port: readNumber("PORT", 5000),
  mongoUri:
    process.env.MONGODB_URI ||
    "mongodb+srv://fixmate:UjG6s6eZS72b3gn7@cluster0.tlly692.mongodb.net/fixmate?retryWrites=true&w=majority",
  dbName: process.env.DB_NAME || "fixmate",
  /** Primary client origin — used for JWT audience and links. */
  clientUrl: clientUrls[0] ?? "https://fixmate-sandy.vercel.app",
  /** Every allowed client origin (CLIENT_URL accepts a comma-separated list). */
  clientUrls,

  // BetterAuth
  betterAuthSecret:
    process.env.BETTER_AUTH_SECRET ||
    "f5575735f2249d68a4010380f608530d01fc9d638b922d624bc8924b0e0201a9",
  betterAuthUrl:
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL
      ? `https://${process.env.VERCEL_URL || "fixmate-server-twq6.vercel.app"}`
      : "http://localhost:5000"),

  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",

  // ImgBB
  imgbbApiKey: process.env.IMGBB_API_KEY || "3d312fb55268f68a2376cbd24c4c586a",
} as const;
