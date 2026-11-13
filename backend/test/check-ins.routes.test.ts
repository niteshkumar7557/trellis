// The HTTP layer of /api/check-ins, with the repo replaced by a fake.

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { deleteCheckIn, listCheckIns, updateCheckIn } from "../src/repos/check-ins.repo.js";
import checkInRoutes from "../src/routes/check-ins.routes.js";
import { bearerToken } from "./auth-token.js";

vi.mock("../src/repos/check-ins.repo.js", () => ({
  listCheckIns: vi.fn(),
  updateCheckIn: vi.fn(),
  deleteCheckIn: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use("/api/check-ins", checkInRoutes);
app.use(notFound);
app.use(errorHandler);

const AUTH = { Authorization: bearerToken(4) };
const ID = "6f1c2c1e-3b8e-4a8e-9d55-0e7f1b2a3c4d";
const CHECK_IN = { id: ID, at: "2026-11-13T09:00:00.000Z", text: "Got it", topicId: "rn-what", outcome: "got" as const };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("/api/check-ins", () => {
  it("needs a token, and has no POST (check-ins come only from saving a proposal)", async () => {
    expect((await request(app).get("/api/check-ins")).status).toBe(401);
    expect((await request(app).post("/api/check-ins").set(AUTH).send({})).status).toBe(404);
  });

  it("lists the token's user's check-ins", async () => {
    vi.mocked(listCheckIns).mockResolvedValue([CHECK_IN]);
    const res = await request(app).get("/api/check-ins").set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([CHECK_IN]);
    expect(listCheckIns).toHaveBeenCalledWith(4);
  });
});

describe("PATCH /api/check-ins/:id", () => {
  it("passes only the fields sent, cleaned", async () => {
    vi.mocked(updateCheckIn).mockResolvedValue({ ...CHECK_IN, outcome: "partly", text: "Mostly" });
    const res = await request(app).patch(`/api/check-ins/${ID}`).set(AUTH).send({ outcome: "partly", text: "  Mostly " });
    expect(res.status).toBe(200);
    expect(updateCheckIn).toHaveBeenCalledWith(4, ID, { outcome: "partly", text: "Mostly" });
  });

  it("refuses an empty change, a big topic, or an unknown topic", async () => {
    for (const body of [{}, { topicId: "rn-intro" }, { topicId: "rn-made-up" }, { outcome: "maybe" }]) {
      const res = await request(app).patch(`/api/check-ins/${ID}`).set(AUTH).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect(updateCheckIn).not.toHaveBeenCalled();
  });

  it("answers 404 for someone else's id, and for an id that isn't a UUID", async () => {
    vi.mocked(updateCheckIn).mockResolvedValue(null);
    expect((await request(app).patch(`/api/check-ins/${ID}`).set(AUTH).send({ text: "x" })).status).toBe(404);
    expect((await request(app).patch("/api/check-ins/42").set(AUTH).send({ text: "x" })).status).toBe(404);
    expect(updateCheckIn).toHaveBeenCalledTimes(1); // the bad id never reached the database
  });
});

describe("DELETE /api/check-ins/:id", () => {
  it("answers 204, or 404 when there was nothing of theirs to delete", async () => {
    vi.mocked(deleteCheckIn).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await request(app).delete(`/api/check-ins/${ID}`).set(AUTH)).status).toBe(204);
    expect((await request(app).delete(`/api/check-ins/${ID}`).set(AUTH)).status).toBe(404);
    expect(deleteCheckIn).toHaveBeenCalledWith(4, ID);
  });
});
