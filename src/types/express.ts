// Type-only import: erased at runtime (this package has no runtime module).
import type {} from "express-serve-static-core";
import type { AuthUser } from "./models.js";

/**
 * `req.user` is attached by the verifyToken middleware.
 *
 * This lives in a real .ts module (not only an ambient .d.ts) and is imported
 * from the entry points below so the augmentation is always part of the
 * compile — including on build platforms that ignore ambient declaration
 * files, such as Vercel.
 */
declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
