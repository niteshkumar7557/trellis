// Neo4j is optional (backend-design.md §2): the site runs without it, and only the three
// routes that read it answer 503 graph_unavailable while it is down or out of date.
//
//   router.get("/:id/graph", requireGraph, handler);
//
// The state is checked at most every 30 seconds and remembered in between. Checking on
// every request would cost several Neo4j queries per request; checking only at boot would
// mean a Neo4j that comes back up (or gets reseeded) stays "down" until a restart.

import type { NextFunction, Request, Response } from "express";
import { checkGraph, type GraphState } from "../repos/graph.repo.js";
import { HttpError } from "../utils/http-error.js";

const RECHECK_MS = 30_000;

let known: { state: GraphState; at: number } | null = null;
// While a check runs, every other request waits for the same one instead of starting its
// own: twenty requests arriving together cause one check, not twenty.
let running: Promise<GraphState> | null = null;

/** The graph's state, from memory if it was checked in the last 30 seconds. */
export async function graphState(now = Date.now()): Promise<GraphState> {
  if (known && now - known.at < RECHECK_MS) return known.state;
  running ??= checkGraph()
    .then(({ state, problems }) => {
      // Log only when the state changes, so a long outage is one line, not one per check.
      if (state !== known?.state) {
        const log = state === "ok" ? console.log : console.error;
        log(`Neo4j: ${state}${problems.length ? `\n  ${problems.join("\n  ")}` : ""}`);
      }
      known = { state, at: now };
      return state;
    })
    .finally(() => {
      running = null;
    });
  return running;
}

/**
 * A Neo4j query failed in the middle of a request (it went down after the last check).
 * Forget the remembered state so the next request checks again, rather than trusting "ok"
 * for up to 30 more seconds. Called by the error handler.
 */
export function forgetGraphState() {
  known = null;
}

export const graphUnavailableError = () =>
  new HttpError(503, "graph_unavailable", "The topic graph is unavailable right now. Try again in a minute.");

export async function requireGraph(_req: Request, _res: Response, next: NextFunction) {
  if ((await graphState()) !== "ok") throw graphUnavailableError();
  next();
}

/**
 * Is this error Neo4j being unreachable? The driver marks those with these codes; anything
 * else (a Cypher typo, say) is our bug and stays a 500.
 */
export function isGraphOutage(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("code" in err)) return false;
  return err.code === "ServiceUnavailable" || err.code === "SessionExpired";
}
