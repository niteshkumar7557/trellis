// The HTTP layer of the path route, with the repo replaced by a fake: no database needed.

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { findPath } from "../src/repos/paths.repo.js";
import topicRoutes from "../src/routes/topics.routes.js";
import { bearerToken } from "./auth-token.js";

vi.mock("../src/repos/paths.repo.js", () => ({ findPath: vi.fn() }));
// requireGraph asks the graph repo whether Neo4j is up; say it is.
vi.mock("../src/repos/graph.repo.js", () => ({
  checkGraph: vi.fn(async () => ({ state: "ok", problems: [] })),
}));

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

  it("answers 404 for an id that isn't in shared/data, without asking Neo4j", async () => {
    const res = await request(app).get("/api/topics/rn-made-up/path-to/rn-flatlist").set("Authorization", bearerToken());
    expect(res.status).toBe(404);
    expect(findPath).not.toHaveBeenCalled();
  });

  it("answers 404 when the repo can't find a topic", async () => {
    vi.mocked(findPath).mockResolvedValue(null);
    const res = await request(app).get(URL).set("Authorization", bearerToken());
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });
});
