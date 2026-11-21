// GET /api/health: Postgres decides the status code.

import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { makeHealthHandler } from "../src/utils/health.js";

function appWith(postgresUp: boolean) {
  const app = express();
  app.get(
    "/api/health",
    makeHealthHandler(() => (postgresUp ? Promise.resolve() : Promise.reject(new Error("down")))),
  );
  return app;
}

describe("GET /api/health", () => {
  it("answers 200 when Postgres is up, and is never cached", async () => {
    const res = await request(appWith(true)).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ postgres: "ok" });
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("answers 503 when Postgres is down", async () => {
    const res = await request(appWith(false)).get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ postgres: "down" });
  });
});
