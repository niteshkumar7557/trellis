// The HTTP layer of the path route. findPath reads shared/data in memory, so the real one
// runs: no fake and no database needed. Its own cases are in paths.test.ts.

import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import topicRoutes from "../src/routes/topics.routes.js";
import { bearerToken } from "./auth-token.js";

const app = express();
app.use("/api/topics", topicRoutes);
app.use(notFound);
app.use(errorHandler);

const URL = "/api/topics/rn-jsx/path-to/rn-state";

describe("GET /api/topics/:topicId/path-to/:targetId", () => {
  it("needs a token", async () => {
    expect((await request(app).get(URL)).status).toBe(401);
  });

  it("answers with the chain in learning order", async () => {
    const res = await request(app).get(URL).set("Authorization", bearerToken());
    expect(res.status).toBe(200);
    expect(res.body.map((t: { id: string }) => t.id)).toEqual(["rn-jsx", "rn-components", "rn-state"]);
  });

  it("answers 200 with [] when there's no chain", async () => {
    const res = await request(app).get("/api/topics/rn-state/path-to/rn-jsx").set("Authorization", bearerToken());
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("answers 404 not_found for an id that isn't a topic", async () => {
    const res = await request(app).get("/api/topics/rn-made-up/path-to/rn-state").set("Authorization", bearerToken());
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });
});
