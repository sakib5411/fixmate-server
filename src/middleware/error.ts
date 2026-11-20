import type { NextFunction, Request, Response } from "express";

/** An error that carries an HTTP status code. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/** Runs when no route matched the request. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Central error handler. Express 5 forwards async errors here automatically.
 * Must keep all four parameters so Express recognises it as error middleware.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof Error ? err.message : "Something went wrong";

  if (status >= 500) {
    console.error("[server error]", err);
  }

  res.status(status).json({ success: false, message });
}
