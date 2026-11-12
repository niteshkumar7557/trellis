// The HTTP layer of the path route, with the repo replaced by a fake: no database needed.

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { findPath } from "../src/repos/paths.repo.js";
import topicRoutes from "../src/routes/topics.routes.js";
import { bearerToken } from "./auth-token.js";

vi.hoisted(() => {
  process.env.JWT_SECRET = "test-secret";
});
vi.mock("../src/repos/paths.repo.js", () => ({ findPath: vi.fn() }));

const app = express();
app.use("/api/topics", topicRoutes);
app.use(notFound);
app.use(errorHandler);

const URL = "/api/topics/rn-components/path-to/rn-flatlist";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/topics/:topicId/path-to/:targetId", () => {
  it("needs a token", async () => {
    expect((await request(app).get(URL)).status).toBe(401);
    expect(findPath).not.toHaveBeenCalled();
  });

  it("answers with the chain, passing the ids in the right order", async () => {
    vi.mocked(findPath).mockResolvedValue([{ id: "rn-components" }, { id: "rn-flatlist" }] as never);
    const res = await request(app).get(URL).set("Authorization", bearerToken());
    expect(res.status).toBe(200);
    expect(res.body.map((t: { id: string }) => t.id)).toEqual(["rn-components", "rn-flatlist"]);
    expect(findPath).toHaveBeenCalledWith("rn-components", "rn-flatlist");
  });

  it("answers 200 with [] when there's no chain", async () => {
    vi.mocked(findPath).mockResolvedValue([]);
    const res = await request(app).get(URL).set("Authorization", bearerToken());
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("answers 404 when a topic doesn't exist", async () => {
    vi.mocked(findPath).mockResolvedValue(null);
    const res = await request(app).get(URL).set("Authorization", bearerToken());
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });
});
