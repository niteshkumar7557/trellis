// The limiter is switched off under Vitest (config.rate_limits), so here it is built with
// `enabled = true` to check that it really limits, and answers in the API's error shape.

import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../src/middlewares/error.middleware.js";
import { makeLimiter } from "../src/middlewares/rate-limit.middleware.js";

describe("makeLimiter", () => {
  it("lets `limit` requests through, then answers 429 rate_limited", async () => {
    const app = express();
    app.get("/try", makeLimiter(2, 60_000, true), (_req, res) => {
      res.sendStatus(204);
    });
    app.use(errorHandler);

    expect((await request(app).get("/try")).status).toBe(204);
    expect((await request(app).get("/try")).status).toBe(204);
    const third = await request(app).get("/try");
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe("rate_limited");
    expect(third.headers["ratelimit-policy"]).toBeDefined(); // tells the client the rule
  });

  it("does nothing when disabled", async () => {
    const app = express();
    app.get("/try", makeLimiter(1, 60_000, false), (_req, res) => {
      res.sendStatus(204);
    });
    for (let i = 0; i < 3; i++) expect((await request(app).get("/try")).status).toBe(204);
  });

  it("can count per student instead of per address", async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.userId = Number(req.headers["x-user"]);
      next();
    });
    app.get("/try", makeLimiter(1, 60_000, true, (req) => `user:${req.userId}`), (_req, res) => {
      res.sendStatus(204);
    });
    app.use(errorHandler);
    expect((await request(app).get("/try").set("x-user", "1")).status).toBe(204);
    expect((await request(app).get("/try").set("x-user", "1")).status).toBe(429);
    expect((await request(app).get("/try").set("x-user", "2")).status).toBe(204); // same address, other student
  });
});
