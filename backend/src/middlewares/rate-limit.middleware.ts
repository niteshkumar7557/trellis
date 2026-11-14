// Limits how often one visitor can call a route (backend-design.md §8 "Security").
// The point on auth routes: a password can't be guessed at speed, and nobody can make the
// server spend all its CPU on bcrypt.
//
// express-rate-limit counts in memory. That is right for ONE server: with two, each would
// count separately and you would need a shared store such as Redis. A restart resets the
// counts, which is acceptable for limits measured in minutes.
//
// The visitor is told apart by IP address. Behind CloudFront and Caddy that address
// arrives in the X-Forwarded-For header, which is why src/app.ts sets "trust proxy" to 2
// in production (TRUST_PROXY_HOPS). Without it, every visitor would look like Caddy and
// share one limit.

import type { Request } from "express";
import rateLimit from "express-rate-limit";
import config from "../config/index.js";
import { HttpError } from "../utils/http-error.js";

const MINUTE = 60 * 1000;

/**
 * A limiter for `limit` requests per `windowMs`, per IP address unless `key` says
 * otherwise. `enabled` defaults to the config (off under Vitest); the limiter's own test
 * turns it on.
 */
export function makeLimiter(
  limit: number,
  windowMs: number,
  enabled = config.rate_limits,
  key?: (req: Request) => string,
) {
  return rateLimit({
    windowMs,
    limit,
    ...(key ? { keyGenerator: key } : {}),
    // Sends the standard RateLimit headers, so a client can see how long to wait.
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => !enabled,
    // Through next(), so a 429 leaves in the same error shape as everything else.
    handler: (_req, _res, next) => {
      next(new HttpError(429, "rate_limited", "Too many attempts. Wait a few minutes and try again."));
    },
  });
}

// login, register, reset-password: each attempt is a bcrypt hash, and each could be a
// guess. One limiter per route, because one instance keeps one count: shared, a student
// who registered and then mistyped their password twice would be counted three times.
export const registerLimiter = makeLimiter(10, 15 * MINUTE);
export const loginLimiter = makeLimiter(10, 15 * MINUTE);
export const resetLimiter = makeLimiter(10, 15 * MINUTE);

/** Deleting the account checks the password again, so it is a guess like a login. */
export const deleteAccountLimiter = makeLimiter(10, 15 * MINUTE);

/**
 * Helper messages, per STUDENT (not per address: a class on one Wi-Fi shares an address).
 * Must come after requireAuth, which sets req.userId. 30 a minute is far above anyone
 * typing; it stops a script, or a stuck client, sending in a loop.
 */
export const helperLimiter = makeLimiter(30, MINUTE, config.rate_limits, (req) => `user:${req.userId}`);

/** refresh: every open tab calls it on load and every 15 minutes, so it needs more room. */
export const refreshLimiter = makeLimiter(60, 15 * MINUTE);
