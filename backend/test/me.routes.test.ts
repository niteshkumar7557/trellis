// The HTTP layer of /api/me, with the users repo replaced by a fake.

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { getStudent, updateName } from "../src/repos/users.repo.js";
import meRoutes from "../src/routes/me.routes.js";
import { bearerToken } from "./auth-token.js";

vi.mock("../src/repos/users.repo.js", () => ({ getStudent: vi.fn(), updateName: vi.fn() }));

const app = express();
app.use(express.json());
app.use("/api/me", meRoutes);
app.use(notFound);
app.use(errorHandler);

const STUDENT = { id: "9", name: "Ada", email: "ada@example.com", joinedAt: "2026-11-13T00:00:00.000Z", hasPassword: false, goals: [] };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/me", () => {
  it("needs a token", async () => {
    expect((await request(app).get("/api/me")).status).toBe(401);
  });

  it("answers the student of the TOKEN's user id", async () => {
    vi.mocked(getStudent).mockResolvedValue(STUDENT);
    const res = await request(app).get("/api/me").set("Authorization", bearerToken(9));
    expect(res.status).toBe(200);
    expect(res.body).toEqual(STUDENT);
    expect(getStudent).toHaveBeenCalledWith(9);
  });

  it("answers 404 when the account was deleted after the token was issued", async () => {
    vi.mocked(getStudent).mockResolvedValue(null);
    const res = await request(app).get("/api/me").set("Authorization", bearerToken(9));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/me", () => {
  it("changes the name, trimmed, and ignores an email in the body", async () => {
    vi.mocked(updateName).mockResolvedValue(true);
    vi.mocked(getStudent).mockResolvedValue({ ...STUDENT, name: "Ada L" });
    const res = await request(app)
      .patch("/api/me")
      .set("Authorization", bearerToken(9))
      .send({ name: "  Ada L ", email: "new@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Ada L");
    expect(updateName).toHaveBeenCalledWith(9, "Ada L");
  });

  it("refuses an empty or over-long name", async () => {
    for (const name of ["   ", "x".repeat(61)]) {
      const res = await request(app).patch("/api/me").set("Authorization", bearerToken(9)).send({ name });
      expect(res.status).toBe(400);
    }
    expect(updateName).not.toHaveBeenCalled();
  });
});
