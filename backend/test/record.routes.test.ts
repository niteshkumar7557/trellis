// The HTTP layer of the student's record so far (goals, claims, opened, subject requests),
// with every repo replaced by a fake. What's checked: the token is required, ids are
// checked against shared/data, and bodies are cleaned before the repo sees them.

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { setGoal } from "../src/repos/goals.repo.js";
import goalRoutes from "../src/routes/goals.routes.js";
import { bearerToken } from "./auth-token.js";

vi.mock("../src/repos/goals.repo.js", () => ({ setGoal: vi.fn() }));

const app = express();
app.use(express.json());
app.use("/api/goals", goalRoutes);
app.use(notFound);
app.use(errorHandler);

const AUTH = { Authorization: bearerToken(3) };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("every record route needs a token", () => {
  it.each([
    ["put", "/api/goals/react-native"],
  ] as const)("%s %s → 401", async (method, url) => {
    const res = await request(app)[method](url).send({});
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/goals/:subjectId", () => {
  it("sets the goal for the token's user", async () => {
    const saved = { subjectId: "redis", goalId: "goal-rd-app", since: "2026-11-13T00:00:00.000Z" };
    vi.mocked(setGoal).mockResolvedValue(saved as never);
    const res = await request(app).put("/api/goals/redis").set(AUTH).send({ goalId: "goal-rd-app" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(saved);
    expect(setGoal).toHaveBeenCalledWith(3, "redis", "goal-rd-app");
  });

  it("answers 404 for an unknown subject", async () => {
    const res = await request(app).put("/api/goals/cobol").set(AUTH).send({ goalId: "goal-rd-app" });
    expect(res.status).toBe(404);
  });

  it("refuses a goal from the other subject, or no goal at all", async () => {
    const wrong = await request(app).put("/api/goals/redis").set(AUTH).send({ goalId: "goal-rn-first-app" });
    expect(wrong.status).toBe(400);
    const none = await request(app).put("/api/goals/redis").set(AUTH).send({});
    expect(none.status).toBe(400);
    expect(setGoal).not.toHaveBeenCalled();
  });
});
