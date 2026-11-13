// The HTTP layer of the subject routes, with the repo replaced by a fake: no database needed.
//
// vi.mock() swaps a whole module for the object we give it, for every file that imports it.
// Vitest moves vi.mock() calls to the top of the file, above the imports, so the route file
// gets the fake. vi.mocked(fn) then lets each test choose what the fake returns.

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { forgetGraphState } from "../src/middlewares/graph.middleware.js";
import { checkGraph, getSubjects, getSubjectGraph } from "../src/repos/graph.repo.js";
import subjectRoutes from "../src/routes/subjects.routes.js";

vi.mock("../src/repos/graph.repo.js", () => ({
  checkGraph: vi.fn(),
  getSubjects: vi.fn(),
  getSubjectGraph: vi.fn(),
}));

const app = express();
app.use("/api/subjects", subjectRoutes);
app.use(notFound);
app.use(errorHandler);

beforeEach(() => {
  vi.resetAllMocks();
  forgetGraphState();
  vi.mocked(checkGraph).mockResolvedValue({ state: "ok", problems: [] });
});

describe("while Neo4j is down or out of date", () => {
  it.each(["down", "drift"] as const)("%s: both routes answer 503 graph_unavailable", async (state) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(checkGraph).mockResolvedValue({ state, problems: ["test"] });
    for (const url of ["/api/subjects", "/api/subjects/redis/graph"]) {
      const res = await request(app).get(url);
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe("graph_unavailable");
    }
    expect(getSubjects).not.toHaveBeenCalled();
  });

  it("answers 503, not 500, when Neo4j drops in the middle of a request", async () => {
    const outage = Object.assign(new Error("Could not perform discovery"), { code: "ServiceUnavailable" });
    vi.mocked(getSubjects).mockRejectedValue(outage);
    const res = await request(app).get("/api/subjects");
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("graph_unavailable");
  });
});

describe("GET /api/subjects", () => {
  it("answers with the subjects, and needs no token", async () => {
    const subjects = [{ id: "redis", name: "Redis", shortName: "Redis", blurb: "A store." }];
    vi.mocked(getSubjects).mockResolvedValue(subjects as never);

    const res = await request(app).get("/api/subjects");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(subjects);
  });
});

describe("GET /api/subjects/:subjectId/graph", () => {
  it("answers with the graph, marked as cacheable for an hour", async () => {
    const graph = {
      topics: [{ id: "rd-strings", name: "Strings" }],
      edges: [{ from: "rd-lists", to: "rd-strings", kind: "needs" }],
      goals: [],
    };
    vi.mocked(getSubjectGraph).mockResolvedValue(graph as never);

    const res = await request(app).get("/api/subjects/redis/graph");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(graph);
    expect(res.headers["cache-control"]).toBe("public, max-age=3600");
    expect(getSubjectGraph).toHaveBeenCalledWith("redis");
  });

  it("answers 404 not_found for a subject that doesn't exist", async () => {
    vi.mocked(getSubjectGraph).mockResolvedValue(null);

    const res = await request(app).get("/api/subjects/cobol/graph");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });

  it("answers 500 without leaking anything when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getSubjectGraph).mockRejectedValue(new Error("secret neo4j detail"));

    const res = await request(app).get("/api/subjects/redis/graph");

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });
});
