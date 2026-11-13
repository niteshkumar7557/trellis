// Prompt takes against the real Postgres.

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import pool from "../../src/db/index.js";
import { listPromptTakes } from "../../src/repos/prompt-takes.repo.js";
import { deleteUsers, registerStudent } from "./helpers.js";

const DOMAIN = "@it-takes.trellis.test";
let ada: Awaited<ReturnType<typeof registerStudent>>;

beforeAll(async () => {
  await deleteUsers(DOMAIN);
  ada = await registerStudent(DOMAIN, "Ada");
});
afterAll(async () => {
  await deleteUsers(DOMAIN);
  await pool.end();
});

describe("prompt takes", () => {
  it("records each take, and lists them newest first, with an optional limit", async () => {
    for (const via of ["copy", "chatgpt", "claude"]) {
      const res = await request(app).post("/api/prompt-takes").set(ada.auth).send({ topicId: "rn-what", via });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: expect.any(String), topicId: "rn-what", via });
    }
    const all = await listPromptTakes(ada.userId);
    expect(all.map((t) => t.via)).toEqual(["claude", "chatgpt", "copy"]);
    expect((await listPromptTakes(ada.userId, 2)).map((t) => t.via)).toEqual(["claude", "chatgpt"]);
  });
});
