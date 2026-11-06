// Every API error leaves the server in ONE shape (backend-design.md §4):
//
//   { "error": { "code": "not_found", "message": "No route GET /api/nope" } }
//
// Both functions are registered LAST in src/app.ts, after every route:
//   app.use(notFound);      ← reached only when no route answered
//   app.use(errorHandler);  ← reached when anything earlier threw or called next(err)

import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error.js";

/** No route matched this method + path. */
export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: { code: "not_found", message: `No route ${req.method} ${req.path}` } });
}

/**
 * Turns anything thrown in a route into the error shape.
 *
 * Express recognises an ERROR handler by its four parameters, so `_next` must stay even
 * though it's unused. In Express 5, a rejected promise from an `async` handler lands here
 * too, with no try/catch needed.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "invalid_request",
        message: "The request body is not valid.",
        details: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    err.type === "entity.parse.failed"
  ) {
    return res.status(400).json({
      error: { code: "invalid_json", message: "The request body is not valid JSON." },
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }

  // Anything else is a bug or an outage (the database is down, a typo, ...). Log the real
  // error for us, and tell the client nothing specific: the message could leak SQL,
  // file paths or other internals.
  console.error(err);
  res.status(500).json({ error: { code: "internal", message: "Something went wrong." } });
}
