// GET /api/health: only Postgres decides the status code; Neo4j is reported alongside.

import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { makeHealthHandler } from "../src/utils/health.js";

function appWith(postgresUp: boolean, neo4j: string | Error) {
  const app = express();
  app.get(
    "/api/health",
    makeHealthHandler(
      () => (postgresUp ? Promise.resolve() : Promise.reject(new Error("down"))),
      () => (neo4j instanceof Error ? Promise.reject(neo4j) : Promise.resolve(neo4j)),
    ),
  );
  return app;
}

describe("GET /api/health", () => {
  it("answers 200 when both are up", async () => {
    const res = await request(appWith(true, "ok")).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ postgres: "ok", neo4j: "ok" });
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("still answers 200 when Neo4j is down or out of date: the site works without it", async () => {
    for (const neo4j of ["down", "drift"]) {
      const res = await request(appWith(true, neo4j)).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.neo4j).toBe(neo4j);
    }
  });

  it("answers 503 when Postgres is down", async () => {
    const res = await request(appWith(false, "ok")).get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body.postgres).toBe("down");
  });

  it("reports a failing Neo4j check as down instead of crashing", async () => {
    const res = await request(appWith(true, new Error("boom"))).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.neo4j).toBe("down");
  });
});
