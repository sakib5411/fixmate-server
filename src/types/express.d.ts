import type { AuthUser } from "./models.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by the `verifyToken` middleware. */
      user?: AuthUser;
    }
  }
}

export {};
