import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { jwt } from "better-auth/plugins";
import { getDb } from "../config/db.js";
import { env } from "../config/env.js";

if (!env.betterAuthSecret) {
  console.warn("⚠️  BETTER_AUTH_SECRET is missing. Sessions will not be secure.");
}

export const auth = betterAuth({
  appName: "FixMate",
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,
  basePath: "/api/auth",
  trustedOrigins: [...env.clientUrls, env.betterAuthUrl],

  // BetterAuth owns the `users` collection (plus sessions/accounts/verifications).
  database: mongodbAdapter(getDb(), { usePlural: true }),

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: true,
      },
      phone: { type: "string", required: false, input: true },
      area: { type: "string", required: false, input: true },
      bio: { type: "string", required: false, input: true },
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once a day
  },

  // Cookies must be cross-site in production (separate client & API domains).
  advanced: {
    defaultCookieAttributes: {
      sameSite: env.isProduction ? "none" : "lax",
      secure: env.isProduction,
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const requestedRole = (user as Record<string, unknown>).role;
          return {
            data: {
              ...user,
              // Never allow self-registration as admin.
              role: requestedRole === "technician" ? "technician" : "customer",
            },
          };
        },
      },
    },
  },

  plugins: [
    jwt({
      jwt: {
        issuer: env.betterAuthUrl,
        audience: env.clientUrl,
        expirationTime: "7d",
        definePayload: ({ user }) => ({
          email: user.email,
          name: user.name,
          role: (user as Record<string, unknown>).role ?? "customer",
        }),
      },
    }),
  ],
});
