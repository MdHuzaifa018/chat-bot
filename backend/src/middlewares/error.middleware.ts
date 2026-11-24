import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError.js";

/**
 * Global Centralized Error Handling Middleware
 * Ensures all errors are sanitized and formatted consistently.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    if (err.retryAfterSeconds !== undefined) {
      res.setHeader("Retry-After", String(err.retryAfterSeconds));
    }
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Handle JSON body-parser syntax errors (malformed JSON)
  if (err instanceof SyntaxError && "status" in err && (err as { status: number }).status === 400) {
    res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Malformed JSON payload in request body.",
      },
    });
    return;
  }

  // Sanitize unknown errors to prevent stack trace or secret leakage
  console.error("[ServerError]", err instanceof Error ? err.message : "Unknown error");
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred. Please try again later.",
    },
  });
}

