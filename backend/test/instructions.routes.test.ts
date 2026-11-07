// The HTTP layer of /api/instructions, with the repo replaced by a fake: no database needed.

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { listInstructions } from "../src/repos/instructions.repo.js";
import instructionRoutes from "../src/routes/instructions.routes.js";
import { bearerToken } from "./auth-token.js";

vi.hoisted(() => {
  process.env.JWT_SECRET = "test-secret";
});
vi.mock("../src/repos/instructions.repo.js", () => ({ listInstructions: vi.fn() }));

const app = express();
app.use("/api/instructions", instructionRoutes);
app.use(notFound);
app.use(errorHandler);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/instructions", () => {
  it("needs a token", async () => {
    expect((await request(app).get("/api/instructions")).status).toBe(401);
  });

  it("answers with the instructions", async () => {
    const lines = [{ id: "base-steps", scope: "base", text: "Go in small steps." }];
    vi.mocked(listInstructions).mockResolvedValue(lines as never);
    const res = await request(app).get("/api/instructions").set("Authorization", bearerToken());
    expect(res.status).toBe(200);
    expect(res.body).toEqual(lines);
  });
});
