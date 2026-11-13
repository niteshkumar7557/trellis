// The HTTP layer of the student's record so far (goals, claims, opened, subject requests),
// with every repo replaced by a fake. What's checked: the token is required, ids are
// checked against shared/data, and bodies are cleaned before the repo sees them.

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { addClaims } from "../src/repos/claims.repo.js";
import { setGoal } from "../src/repos/goals.repo.js";
import { openTopic } from "../src/repos/opened.repo.js";
import { addSubjectRequest } from "../src/repos/subject-requests.repo.js";
import claimRoutes from "../src/routes/claims.routes.js";
import goalRoutes from "../src/routes/goals.routes.js";
import openedRoutes from "../src/routes/opened.routes.js";
import subjectRequestRoutes from "../src/routes/subject-requests.routes.js";
import { bearerToken } from "./auth-token.js";

vi.mock("../src/repos/goals.repo.js", () => ({ setGoal: vi.fn() }));
vi.mock("../src/repos/claims.repo.js", () => ({ addClaims: vi.fn() }));
vi.mock("../src/repos/opened.repo.js", () => ({ openTopic: vi.fn() }));
vi.mock("../src/repos/subject-requests.repo.js", () => ({ addSubjectRequest: vi.fn() }));

const app = express();
app.use(express.json());
app.use("/api/goals", goalRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/opened", openedRoutes);
app.use("/api/subject-requests", subjectRequestRoutes);
app.use(notFound);
app.use(errorHandler);

const AUTH = { Authorization: bearerToken(3) };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("every record route needs a token", () => {
  it.each([
    ["put", "/api/goals/react-native"],
    ["post", "/api/claims"],
    ["post", "/api/opened"],
    ["post", "/api/subject-requests"],
  ] as const)("%s %s → 401", async (method, url) => {
    const res = await request(app)[method](url).send({});
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/goals/:subjectId", () => {
  it("sets the goal for the token's user", async () => {
    const saved = { subjectId: "redis", goalId: "goal-rd-app", since: "2026-11-13T00:00:00.000Z" };
    vi.mocked(setGoal).mockResolvedValue(saved as never);
    const res = await request(app).put("/api/goals/redis").set(AUTH).send({ goalId: "goal-rd-app" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(saved);
    expect(setGoal).toHaveBeenCalledWith(3, "redis", "goal-rd-app");
  });

  it("answers 404 for an unknown subject", async () => {
    const res = await request(app).put("/api/goals/cobol").set(AUTH).send({ goalId: "goal-rd-app" });
    expect(res.status).toBe(404);
  });

  it("refuses a goal from the other subject, or no goal at all", async () => {
    const wrong = await request(app).put("/api/goals/redis").set(AUTH).send({ goalId: "goal-rn-first-app" });
    expect(wrong.status).toBe(400);
    const none = await request(app).put("/api/goals/redis").set(AUTH).send({});
    expect(none.status).toBe(400);
    expect(setGoal).not.toHaveBeenCalled();
  });
});

describe("POST /api/claims", () => {
  it("saves the claims, keeping only the LAST one per topic", async () => {
    vi.mocked(addClaims).mockResolvedValue([]);
    const res = await request(app)
      .post("/api/claims")
      .set(AUTH)
      .send({
        claims: [
          { topicId: "rn-intro", claim: "know" },
          { topicId: "rn-react", claim: "new" },
          { topicId: "rn-intro", claim: "shaky" }, // changed their mind
        ],
      });
    expect(res.status).toBe(201);
    expect(addClaims).toHaveBeenCalledWith(3, [
      { topicId: "rn-intro", claim: "shaky" },
      { topicId: "rn-react", claim: "new" },
    ]);
  });

  it("refuses an unknown topic, an unknown claim, or an empty list", async () => {
    for (const claims of [[{ topicId: "rn-made-up", claim: "know" }], [{ topicId: "rn-intro", claim: "expert" }], []]) {
      const res = await request(app).post("/api/claims").set(AUTH).send({ claims });
      expect(res.status).toBe(400);
    }
    expect(addClaims).not.toHaveBeenCalled();
  });
});

describe("POST /api/opened", () => {
  it("opens a big topic", async () => {
    const res = await request(app).post("/api/opened").set(AUTH).send({ topicId: "rn-intro" });
    expect(res.status).toBe(204);
    expect(openTopic).toHaveBeenCalledWith(3, "rn-intro");
  });

  it("refuses a subtopic or an unknown topic", async () => {
    for (const topicId of ["rn-what", "rn-made-up"]) {
      const res = await request(app).post("/api/opened").set(AUTH).send({ topicId });
      expect(res.status).toBe(400);
    }
    expect(openTopic).not.toHaveBeenCalled();
  });
});

describe("POST /api/subject-requests", () => {
  it("saves the text, trimmed", async () => {
    const res = await request(app).post("/api/subject-requests").set(AUTH).send({ text: "  Docker  " });
    expect(res.status).toBe(204);
    expect(addSubjectRequest).toHaveBeenCalledWith(3, "Docker");
  });

  it("refuses an empty text or one over 120 characters", async () => {
    for (const text of ["   ", "x".repeat(121)]) {
      const res = await request(app).post("/api/subject-requests").set(AUTH).send({ text });
      expect(res.status).toBe(400);
    }
  });
});
