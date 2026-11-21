// The HTTP layer of the subject routes. The repo reads shared/data in memory, so the real
// one runs: no fake and no database needed.

import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { subjects, topicsOf } from "@shared/data";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import subjectRoutes from "../src/routes/subjects.routes.js";

const app = express();
app.use("/api/subjects", subjectRoutes);
app.use(notFound);
app.use(errorHandler);

describe("GET /api/subjects", () => {
  it("answers with the subjects, and needs no token", async () => {
    const res = await request(app).get("/api/subjects");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(subjects);
  });
});

describe("GET /api/subjects/:subjectId/graph", () => {
  it("answers with the subject's graph, marked as cacheable for an hour", async () => {
    const res = await request(app).get("/api/subjects/redis/graph");
    expect(res.status).toBe(200);
    expect(res.body.topics).toEqual(topicsOf("redis"));
    expect(res.body.edges.length).toBeGreaterThan(0);
    expect(res.body.goals.length).toBeGreaterThan(0);
    expect(res.headers["cache-control"]).toBe("public, max-age=3600");
  });

  it("answers 404 not_found for a subject that doesn't exist", async () => {
    const res = await request(app).get("/api/subjects/cobol/graph");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });
});
