// The HTTP layer of the subject routes, with the repo replaced by a fake: no database needed.
//
// vi.mock() swaps a whole module for the object we give it, for every file that imports it.
// Vitest moves vi.mock() calls to the top of the file, above the imports, so the route file
// gets the fake. vi.mocked(fn) then lets each test choose what the fake returns.

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { getSubjects, getSubjectGraph } from "../src/repos/graph.repo.js";
import subjectRoutes from "../src/routes/subjects.routes.js";

vi.mock("../src/repos/graph.repo.js", () => ({
  getSubjects: vi.fn(),
  getSubjectGraph: vi.fn(),
}));

const app = express();
app.use("/api/subjects", subjectRoutes);
app.use(notFound);
app.use(errorHandler);

beforeEach(() => {
  vi.resetAllMocks();
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

// ---------------------------------------------------------------- Task B (7 Nov)
// Remove `.skip` and write each body, in the same style as the test above.
describe("GET /api/subjects/:subjectId/graph", () => {
  it.skip("answers with the graph, marked as cacheable for an hour", async () => {
    // TODO(Task B): make the fake getSubjectGraph return a small graph. Expect 200, that
    // body, and res.headers["cache-control"] to be "public, max-age=3600". Also expect the
    // fake to have been called with the subject id from the URL.
  });

  it.skip("answers 404 not_found for a subject that doesn't exist", async () => {
    // TODO(Task B): the fake returns null. Expect 404 and error.code "not_found".
  });

  it.skip("answers 500 without leaking anything when the database fails", async () => {
    // TODO(Task B): the fake rejects with new Error("secret neo4j detail"). Expect 500, and
    // "secret" not in the body. Silence console.error as test/errors.test.ts does.
  });
});
