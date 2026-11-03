// Every API error leaves the server in ONE shape (backend-design.md §4):
//
//   { "error": { "code": "not_found", "message": "No route GET /api/nope" } }
//
// Both functions are registered LAST in src/app.ts, after every route:
//   app.use(notFound);      ← reached only when no route answered
//   app.use(errorHandler);  ← reached when anything earlier threw or called next(err)

import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod"; // used by Task A's TODO 1
import { HttpError } from "../utils/http-error.js"; // used by Task A's TODO 3

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
  // ------------------------------------------------------------------ Task A (3 Nov) fills in
  // TODO(Task A) 1. A body that failed validateBody() → 400 "invalid_request" with details.
  // TODO(Task A) 2. A body that isn't valid JSON → 400 "invalid_json".
  // TODO(Task A) 3. An HttpError thrown by a route → its own status, code and message.
  // ------------------------------------------------------------------

  // Anything else is a bug or an outage (the database is down, a typo, ...). Log the real
  // error for us, and tell the client nothing specific: the message could leak SQL,
  // file paths or other internals.
  console.error(err);
  res.status(500).json({ error: { code: "internal", message: "Something went wrong." } });
}
