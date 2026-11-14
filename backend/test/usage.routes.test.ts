// The HTTP layer of GET /api/usage, with the spend replaced by a fake. What's checked:
// whose numbers it reads, and that only percentages leave the server.

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { spendFor } from "../src/repos/ai-calls.repo.js";
import usageRoutes from "../src/routes/usage.routes.js";
import { bearerToken } from "./auth-token.js";

// The AI is on for this file (Vitest's default is off). vi.hoisted runs before the
// imports above, so config/index.ts sees it when it first loads.
vi.hoisted(() => {
  process.env.AI_PROVIDER = "bedrock";
});
vi.mock("../src/db/index.js", () => ({ default: {} }));
vi.mock("../src/repos/ai-calls.repo.js", () => ({ spendFor: vi.fn() }));

const app = express();
app.use("/api/usage", usageRoutes);
app.use(notFound);
app.use(errorHandler);

const windows = { dayEnds: new Date("2026-11-15T00:00:00Z"), weekEnds: new Date("2026-11-16T00:00:00Z") };

beforeEach(() => vi.clearAllMocks());

describe("GET /api/usage", () => {
  it("needs a token", async () => {
    expect((await request(app).get("/api/usage")).status).toBe(401);
    expect(spendFor).not.toHaveBeenCalled();
  });

  it("answers the usage of the TOKEN's account, as percentages, never cached", async () => {
    vi.mocked(spendFor).mockResolvedValue({ spend: { siteDay: 0.1, userDay: 0.015, userWeek: 0.1 }, windows });
    const res = await request(app).get("/api/usage").set("Authorization", bearerToken(9));
    expect(res.status).toBe(200);
    expect(vi.mocked(spendFor).mock.calls[0]![0]).toBe(9);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body).toEqual({
      on: true,
      day: { usedPct: 25, resetsAt: "2026-11-15T00:00:00.000Z" },
      week: { usedPct: 40, resetsAt: "2026-11-16T00:00:00.000Z" },
      basic: null,
    });
  });

  it("never sends dollars, even at a limit", async () => {
    vi.mocked(spendFor).mockResolvedValue({ spend: { siteDay: 0.31, userDay: 0.0612, userWeek: 0.0612 }, windows });
    const res = await request(app).get("/api/usage").set("Authorization", bearerToken(9));
    expect(res.body.basic).toBe("day");
    expect(res.body.day.usedPct).toBe(100);
    // None of the amounts, in any form, and no field named after money.
    expect(res.text).not.toMatch(/0\.31|0\.06|usd|cost|spend|limit/i);
  });
});
