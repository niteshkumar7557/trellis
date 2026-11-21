// GET /api/health → { postgres: "ok" | "down" }
//
// 200 when Postgres answers, 503 when it doesn't. Postgres is the only database: the
// topic graph is read from shared/data in memory (repos/graph.repo.ts), so it can't be down.
// Docker's health check calls this, so a 503 gets the API container marked unhealthy.
//
// The check is passed in, so the test can use a fake and no database.

import type { Request, Response } from "express";

export function makeHealthHandler(pingPostgres: () => Promise<unknown>) {
  return async (_req: Request, res: Response) => {
    const postgres = await pingPostgres().then(
      () => "ok",
      () => "down",
    );
    // Never cached: a stale "ok" from a proxy would hide an outage.
    res.set("Cache-Control", "no-store");
    res.status(postgres === "ok" ? 200 : 503).json({ postgres });
  };
}
