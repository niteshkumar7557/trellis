// Guards a route: `router.get("/", requireAuth, handler)`. The request must carry
//   Authorization: Bearer <access token>
// and the token must be valid and unexpired. Then req.userId holds who is signed in.
//
// The database is not touched. That is the point of a short-lived signed token: checking
// it is a signature check. The price is that a deleted account's access token keeps
// working for up to 15 minutes; every query is scoped by user id, so it finds nothing.

import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/http-error.js";
import { verifyAccessToken } from "../utils/tokens.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  const userId = token ? verifyAccessToken(token) : null;

  // One answer for "no token" and "bad token": the frontend does the same thing for both
  // (refresh once, else go to the login page).
  if (userId === null) throw new HttpError(401, "unauthorized", "Please sign in again.");

  req.userId = userId;
  next();
}

/**
 * Who is signed in. Use this in handlers instead of `req.userId!`: if a route was
 * registered without requireAuth, this fails with a 500 and a clear log line, rather than
 * running a query for user `undefined`.
 */
export function currentUserId(req: Request): number {
  if (req.userId === undefined) {
    throw new Error(`currentUserId: ${req.method} ${req.path} is missing requireAuth`);
  }
  return req.userId;
}
