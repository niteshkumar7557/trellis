// The HTTP layer of /api/prompt-takes, with the repo replaced by a fake.

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { addPromptTake } from "../src/repos/prompt-takes.repo.js";
import promptTakeRoutes from "../src/routes/prompt-takes.routes.js";
import { bearerToken } from "./auth-token.js";

vi.mock("../src/repos/prompt-takes.repo.js", () => ({ addPromptTake: vi.fn() }));

const app = express();
app.use(express.json());
app.use("/api/prompt-takes", promptTakeRoutes);
app.use(notFound);
app.use(errorHandler);

const AUTH = { Authorization: bearerToken(4) };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/prompt-takes", () => {
  it("needs a token", async () => {
    expect((await request(app).post("/api/prompt-takes").send({ topicId: "rn-what", via: "copy" })).status).toBe(401);
  });

  it("records the take and answers 201 with it", async () => {
    const take = { id: "1", topicId: "rn-what", via: "claude" as const, at: "2026-11-13T09:00:00.000Z" };
    vi.mocked(addPromptTake).mockResolvedValue(take);
    const res = await request(app).post("/api/prompt-takes").set(AUTH).send({ topicId: "rn-what", via: "claude" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(take);
    expect(addPromptTake).toHaveBeenCalledWith(4, "rn-what", "claude");
  });

  it("refuses an unknown topic, or a way of taking it we don't offer (Gemini)", async () => {
    for (const body of [{ topicId: "rn-made-up", via: "copy" }, { topicId: "rn-what", via: "gemini" }]) {
      expect((await request(app).post("/api/prompt-takes").set(AUTH).send(body)).status).toBe(400);
    }
    expect(addPromptTake).not.toHaveBeenCalled();
  });
});
