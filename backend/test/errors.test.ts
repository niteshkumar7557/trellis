// Tests for the error shape: src/middlewares/error.middleware.ts, validate.middleware.ts
// and src/utils/http-error.ts.
//
// They run on a TINY Express app built right here, not on src/app.ts. That way no database
// is needed, and each route below exists only to trigger one kind of error.
// supertest sends real HTTP requests to the app without opening a port.

import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { validateBody } from "../src/middlewares/validate.middleware.js";
import { HttpError } from "../src/utils/http-error.js";

const app = express();
app.use(express.json({ limit: "1kb" })); // small, so the 413 test needs a small body
app.post("/echo", validateBody(z.object({ name: z.string().min(1) })), (req, res) => {
  res.json(req.body);
});
app.get("/taken", () => {
  throw new HttpError(409, "conflict", "That email is already taken.");
});
app.get("/boom", () => {
  throw new Error("secret database detail");
});
app.get("/boom-async", async () => {
  throw new Error("secret async detail");
});
app.post("/nested", validateBody(z.object({ goal: z.object({ id: z.string() }) })), (_req, res) => {
  res.end();
});
app.use(notFound);
app.use(errorHandler);

/** The 500 tests make errorHandler log on purpose; keep the test output readable. */
const quietConsoleError = () => vi.spyOn(console, "error").mockImplementation(() => {});

describe("the error shape", () => {
  it("passes a valid body through, cleaned by zod", async () => {
    const res = await request(app).post("/echo").send({ name: "Ada", extra: "dropped" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: "Ada" });
  });

  it("answers 404 not_found for an unknown route", async () => {
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "not_found", message: "No route GET /nope" } });
  });

  it("answers 500 internal for a bug, without leaking the real message", async () => {
    const log = quietConsoleError();
    const res = await request(app).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("internal");
    expect(JSON.stringify(res.body)).not.toContain("secret");
    expect(log).toHaveBeenCalled(); // ...but we did log it, for ourselves
    log.mockRestore();
  });

  it("catches a rejected promise from an async handler (Express 5)", async () => {
    const log = quietConsoleError();
    const res = await request(app).get("/boom-async");
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("internal");
    log.mockRestore();
  });

  it("answers 400 invalid_request with details for a body that fails the schema", async () => {
    const res = await request(app).post("/echo").send({ name: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_request");
    expect(res.body.error.details[0].path).toBe("name");
  });

  it("answers 400 invalid_json for a body that isn't JSON", async () => {
    const res = await request(app).post("/echo").set("Content-Type", "application/json").send('{"name": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_json");
  });

  it("answers 413 too_large for a body over the limit, not 500", async () => {
    const res = await request(app).post("/echo").send({ name: "x".repeat(2000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("too_large");
  });

  it("answers an HttpError with its own status, code and message", async () => {
    const res = await request(app).get("/taken");
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: { code: "conflict", message: "That email is already taken." } });
  });

  it("answers validation errors with a dotted path for a nested field", async () => {
    const res = await request(app).post("/nested").send({ goal: {} });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe("goal.id");
  });
});
