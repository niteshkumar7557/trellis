// GET /api/health → { postgres: "ok" | "down", neo4j: "ok" | "down" | "drift" }
//
// 200 when Postgres answers, 503 when it doesn't. Neo4j is reported but never changes the
// status: the site works without it (backend-design.md §2), so a health check that failed
// on Neo4j would get a working server restarted for nothing.
//
// The two checks are passed in, so the test can use fakes and no database.

import type { Request, Response } from "express";

export function makeHealthHandler(pingPostgres: () => Promise<unknown>, graphState: () => Promise<string>) {
  return async (_req: Request, res: Response) => {
    const [postgres, neo4j] = await Promise.all([
      pingPostgres().then(
        () => "ok",
        () => "down",
      ),
      graphState().catch(() => "down"),
    ]);
    // Never cached: a stale "ok" from a proxy would hide an outage.
    res.set("Cache-Control", "no-store");
    res.status(postgres === "ok" ? 200 : 503).json({ postgres, neo4j });
  };
}
