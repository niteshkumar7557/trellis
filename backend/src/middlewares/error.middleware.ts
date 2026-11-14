// Every API error leaves the server in ONE shape (backend-design.md §4):
//
//   { "error": { "code": "not_found", "message": "No route GET /api/nope" } }
//
// Both functions are registered LAST in src/app.ts, after every route:
//   app.use(notFound);      ← reached only when no route answered
//   app.use(errorHandler);  ← reached when anything earlier threw or called next(err)

import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/http-error.js";
import { forgetGraphState, graphUnavailableError, isGraphOutage } from "./graph.middleware.js";

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
  // express.json() reports its own failures with a `type` field. Without these two checks
  // they would fall through to the 500 below and look like our bug.
  const bodyParserType = typeof err === "object" && err !== null && "type" in err ? err.type : null;
  if (bodyParserType === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "invalid_json", message: "The request body is not valid JSON." },
    });
  }
  if (bodyParserType === "entity.too.large") {
    return res.status(413).json({
      error: { code: "too_large", message: "The request body is too large." },
    });
  }

  // Neo4j went down after requireGraph last saw it up. It is an outage of an optional
  // part, not a bug: answer like requireGraph would have, and make the next request check.
  if (isGraphOutage(err)) {
    forgetGraphState();
    err = graphUnavailableError();
  }

  if (err instanceof HttpError) {
    const error = { code: err.code, message: err.message, ...(err.details === undefined ? {} : { details: err.details }) };
    return res.status(err.status).json({ error });
  }

  // Anything else is a bug or an outage (the database is down, a typo, ...). Log the real
  // error for us, and tell the client nothing specific: the message could leak SQL,
  // file paths or other internals.
  console.error(err);
  res.status(500).json({ error: { code: "internal", message: "Something went wrong." } });
}
