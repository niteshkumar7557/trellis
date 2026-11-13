// Experiences against the real Postgres: editing rebuilds the line, and one student can't
// reach another's.

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import pool from "../../src/db/index.js";
import { listExperiences } from "../../src/repos/experiences.repo.js";
import { deleteUsers, insertSavedExperience, registerStudent } from "./helpers.js";

const DOMAIN = "@it-experiences.trellis.test";
let ada: Awaited<ReturnType<typeof registerStudent>>;
let bob: Awaited<ReturnType<typeof registerStudent>>;

beforeAll(async () => {
  await deleteUsers(DOMAIN);
  ada = await registerStudent(DOMAIN, "Ada");
  bob = await registerStudent(DOMAIN, "Bob");
});
afterAll(async () => {
  await deleteUsers(DOMAIN);
  await pool.end();
});

describe("experiences", () => {
  it("edits the text and kind, and rebuilds the line", async () => {
    const { experienceId, messageId } = await insertSavedExperience(ada.userId, "rn-what", "hard", "old words");
    const res = await request(app)
      .patch(`/api/experiences/${experienceId}`)
      .set(ada.auth)
      .send({ text: "i finally got it!!", kind: "clicked" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: experienceId,
      topicId: "rn-what",
      kind: "clicked",
      text: "i finally got it!!",
      line: "I finally got it.",
      messageId,
    });
  });

  it("lists newest first (what GET /api/state will use)", async () => {
    const list = await listExperiences(ada.userId);
    expect(list.length).toBeGreaterThan(0);
    const times = list.map((e) => e.at);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it("removes one, and never lets another student touch it", async () => {
    const { experienceId } = await insertSavedExperience(ada.userId, "rn-why", "easy", "simple");
    expect((await request(app).patch(`/api/experiences/${experienceId}`).set(bob.auth).send({ text: "x" })).status).toBe(404);
    expect((await request(app).delete(`/api/experiences/${experienceId}`).set(bob.auth)).status).toBe(404);
    expect((await request(app).delete(`/api/experiences/${experienceId}`).set(ada.auth)).status).toBe(204);
  });
});
