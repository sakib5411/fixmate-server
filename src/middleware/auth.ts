import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env.js";
import { HttpError } from "./error.js";
import { USER_ROLES, type UserRole } from "../types/models.js";

const jwks = createRemoteJWKSet(new URL(`${env.betterAuthUrl}/api/auth/jwks`));

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

/**
 * Verifies the BetterAuth-issued JWT from the `Authorization: Bearer <token>` header.
 * Responds 401 when the token is missing, invalid or expired.
 */
export async function verifyToken(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = readBearerToken(req);
  if (!token) {
    throw new HttpError(401, "Unauthorized: missing bearer token");
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.betterAuthUrl,
      audience: env.clientUrl,
    });

    if (!payload.sub || typeof payload.email !== "string") {
      throw new Error("Token is missing required claims");
    }

    const role = USER_ROLES.includes(payload.role as UserRole)
      ? (payload.role as UserRole)
      : "customer";

    req.user = {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : "",
      role,
    };

    next();
  } catch {
    throw new HttpError(401, "Unauthorized: invalid or expired token");
  }
}

/** Allows only the given roles. Assumes `verifyToken` ran first. */
export function verifyRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new HttpError(401, "Unauthorized");
    }
    if (!roles.includes(req.user.role)) {
      throw new HttpError(403, "Forbidden: you do not have permission for this action");
    }
    next();
  };
}

export const verifyCustomer = verifyRole("customer");
export const verifyTechnician = verifyRole("technician");
export const verifyAdmin = verifyRole("admin");
