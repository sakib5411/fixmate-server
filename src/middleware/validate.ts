import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { HttpError } from "./error.js";

/** Validates `req.body` against a Zod schema and replaces it with the parsed data. */
export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      throw new HttpError(400, issue?.message ?? "Invalid request body");
    }
    req.body = result.data;
    next();
  };
}
