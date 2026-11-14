// The HTTP layer of /api/helper, with the database replaced by fakes. What's checked here:
// what the routes accept, and what they pass on. Real conversations are in
// test/integration/helper.test.ts.

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { findMessages, insertMessage, listMessages, messageExists } from "../src/repos/chat.repo.js";
import helperRoutes from "../src/routes/helper.routes.js";
import { bearerToken } from "./auth-token.js";

vi.mock("../src/db/index.js", () => ({
  default: {},
  // Runs the work with a fake client, as if inside a transaction.
  inTransaction: vi.fn(async (work: (db: object) => unknown) => work({})),
}));
vi.mock("../src/repos/chat.repo.js", () => ({
  listMessages: vi.fn(),
  findMessages: vi.fn(),
  insertMessage: vi.fn(),
  messageExists: vi.fn(),
}));
vi.mock("../src/repos/check-ins.repo.js", () => ({ listCheckIns: vi.fn(async () => []) }));
vi.mock("../src/repos/claims.repo.js", () => ({ listClaims: vi.fn(async () => []) }));
vi.mock("../src/repos/experiences.repo.js", () => ({ listExperiences: vi.fn(async () => []) }));
vi.mock("../src/repos/goals.repo.js", () => ({
  listGoals: vi.fn(async () => [{ subjectId: "react-native", goalId: "goal-rn-first-app", since: "" }]),
}));
vi.mock("../src/repos/opened.repo.js", () => ({ listOpened: vi.fn(async () => []) }));

const app = express();
app.use(express.json());
app.use("/api/helper", helperRoutes);
app.use(notFound);
app.use(errorHandler);

const AUTH = { Authorization: bearerToken(4) };
const URL = "/api/helper/react-native/messages";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listMessages).mockResolvedValue({ messages: [], more: false });
  vi.mocked(insertMessage).mockResolvedValueOnce("id-student").mockResolvedValueOnce("id-helper");
  vi.mocked(findMessages).mockResolvedValue([]);
});

describe("POST /api/helper/:subjectId/messages", () => {
  it("needs a token, and a real subject", async () => {
    expect((await request(app).post(URL).send({ text: "hi" })).status).toBe(401);
    expect((await request(app).post("/api/helper/cobol/messages").set(AUTH).send({ text: "hi" })).status).toBe(404);
  });

  it("stores the typed message as read by the rules, then the reply", async () => {
    const res = await request(app).post(URL).set(AUTH).send({ text: "  what should I do next?  " });
    expect(res.status).toBe(201);
    const [student, helper] = vi.mocked(insertMessage).mock.calls;
    expect(student![3]).toEqual({ role: "student", text: "what should I do next?", readBy: "rules" });
    expect(helper![3]).toMatchObject({ role: "helper", text: expect.stringMatching(/^Next up: /) });
    expect(findMessages).toHaveBeenCalledWith(4, ["id-student", "id-helper"]);
  });

  it("stores a tap with its label as the student's words, read by nobody", async () => {
    await request(app)
      .post(URL)
      .set(AUTH)
      .send({ pick: { outcome: "got", topicIds: ["rn-state"], label: "Got it" } });
    const [student, helper] = vi.mocked(insertMessage).mock.calls;
    expect(student![3]).toEqual({ role: "student", text: "Got it", readBy: "tap" });
    expect(helper![3]).toMatchObject({ asks: { kind: "easy" } }); // "Nice, State done. What felt easy…?"
  });

  it("refuses a tap on another subject's topic", async () => {
    const res = await request(app)
      .post(URL)
      .set(AUTH)
      .send({ pick: { outcome: "got", topicIds: ["rd-strings"], label: "Got it" } });
    expect(res.status).toBe(400);
    expect(insertMessage).not.toHaveBeenCalled();
  });

  it("refuses an empty message, one over 2,000 characters, or a body that is both", async () => {
    for (const body of [
      { text: "   " },
      { text: "x".repeat(2001) },
      { text: "hi", pick: { outcome: "got", topicIds: ["rn-state"], label: "Got it" } },
      {},
    ]) {
      expect((await request(app).post(URL).set(AUTH).send(body)).status, JSON.stringify(body)).toBe(400);
    }
  });

  it("ignores a selected topic that isn't in this subject", async () => {
    await request(app).post(URL).set(AUTH).send({ text: "finished it", selected: "rd-strings" });
    // With no usable topic, the reply asks which one instead of proposing.
    expect(vi.mocked(insertMessage).mock.calls[1]![3]).toMatchObject({ text: "Which topic was that?" });
  });
});

describe("GET /api/helper/:subjectId/messages", () => {
  it("pages with a cursor and a limit", async () => {
    vi.mocked(messageExists).mockResolvedValue(true);
    const before = "6f1c2c1e-3b8e-4a8e-9d55-0e7f1b2a3c4d";
    const res = await request(app).get(`${URL}?before=${before}&limit=10`).set(AUTH);
    expect(res.status).toBe(200);
    expect(listMessages).toHaveBeenCalledWith(4, "react-native", 10, {}, before);
  });

  it("answers 404 for a cursor that isn't theirs, and 400 for a bad limit", async () => {
    vi.mocked(messageExists).mockResolvedValue(false);
    expect((await request(app).get(`${URL}?before=6f1c2c1e-3b8e-4a8e-9d55-0e7f1b2a3c4d`).set(AUTH)).status).toBe(404);
    expect((await request(app).get(`${URL}?before=nope`).set(AUTH)).status).toBe(404);
    expect((await request(app).get(`${URL}?limit=500`).set(AUTH)).status).toBe(400);
  });
});
