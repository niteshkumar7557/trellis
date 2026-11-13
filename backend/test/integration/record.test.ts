// The student's record against the real Postgres: goals, claims, opened big topics and
// subject requests, and what happens to each when the account is deleted.

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import pool from "../../src/db/index.js";

const DOMAIN = "@it-record.trellis.test";
const cleanUp = () => pool.query("DELETE FROM users WHERE email LIKE $1", [`%${DOMAIN}`]);

let auth = { Authorization: "" };
let userId = 0;

beforeAll(async () => {
  await cleanUp();
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Lin", email: `lin${DOMAIN}`, password: "correct horse" });
  auth = { Authorization: `Bearer ${res.body.accessToken}` };
  userId = Number(res.body.student.id);
});
afterAll(async () => {
  await cleanUp();
  await pool.end();
});

describe("goals", () => {
  it("sets a goal and shows it in GET /api/me", async () => {
    const res = await request(app).put("/api/goals/react-native").set(auth).send({ goalId: "goal-rn-first-app" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ subjectId: "react-native", goalId: "goal-rn-first-app" });

    const me = await request(app).get("/api/me").set(auth);
    expect(me.body.goals).toEqual([res.body]);
  });

  it("keeps `since` when the same goal is set again, and moves it when the goal changes", async () => {
    // Make the existing goal look old, so a reset to NOW() would show.
    await pool.query("UPDATE student_goals SET since = '2026-01-01' WHERE user_id = $1", [userId]);

    const same = await request(app).put("/api/goals/react-native").set(auth).send({ goalId: "goal-rn-first-app" });
    expect(same.body.since).toBe(new Date("2026-01-01").toISOString());

    const changed = await request(app).put("/api/goals/react-native").set(auth).send({ goalId: "goal-rn-full" });
    expect(changed.body.goalId).toBe("goal-rn-full");
    expect(new Date(changed.body.since).getFullYear()).toBeGreaterThanOrEqual(2026);
    expect(changed.body.since).not.toBe(same.body.since);

    const { rows } = await pool.query("SELECT count(*)::int AS n FROM student_goals WHERE user_id = $1", [userId]);
    expect(rows[0].n).toBe(1); // still one goal per subject
  });

  it("holds one goal per subject, side by side", async () => {
    await request(app).put("/api/goals/redis").set(auth).send({ goalId: "goal-rd-app" });
    const me = await request(app).get("/api/me").set(auth);
    expect(me.body.goals.map((g: { subjectId: string }) => g.subjectId).sort()).toEqual(["react-native", "redis"]);
  });
});

describe("claims", () => {
  it("saves a batch in one go and keeps history", async () => {
    const first = await request(app)
      .post("/api/claims")
      .set(auth)
      .send({ claims: [{ topicId: "rn-intro", claim: "know" }, { topicId: "rn-react", claim: "shaky" }] });
    expect(first.status).toBe(201);
    expect(first.body).toHaveLength(2);
    expect(first.body[0]).toMatchObject({ topicId: "rn-intro", claim: "know", at: expect.any(String) });

    await request(app).post("/api/claims").set(auth).send({ claims: [{ topicId: "rn-intro", claim: "new" }] });

    // Both claims on rn-intro are kept; the newest one is the one that counts.
    const { rows } = await pool.query(
      "SELECT claim FROM claims WHERE user_id = $1 AND topic_id = 'rn-intro' ORDER BY at DESC",
      [userId],
    );
    expect(rows.map((r) => r.claim)).toEqual(["new", "know"]);
  });
});

describe("opened big topics", () => {
  it("opens a big topic, and opening it again is not an error", async () => {
    expect((await request(app).post("/api/opened").set(auth).send({ topicId: "rn-react" })).status).toBe(204);
    expect((await request(app).post("/api/opened").set(auth).send({ topicId: "rn-react" })).status).toBe(204);
    const { rows } = await pool.query("SELECT topic_id FROM opened_topics WHERE user_id = $1", [userId]);
    expect(rows).toEqual([{ topic_id: "rn-react" }]);
  });
});

describe("deleting the account", () => {
  it("deletes the whole record, but keeps subject requests without the name", async () => {
    await request(app).post("/api/subject-requests").set(auth).send({ text: "Docker" });
    const made = await pool.query("SELECT id FROM subject_requests WHERE user_id = $1", [userId]);
    const requestId = made.rows[0].id;

    await pool.query("DELETE FROM users WHERE id = $1", [userId]);

    for (const table of ["student_goals", "claims", "opened_topics", "refresh_tokens"]) {
      const { rows } = await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE user_id = $1`, [userId]);
      expect(rows[0].n, table).toBe(0);
    }
    const { rows } = await pool.query("SELECT user_id, text FROM subject_requests WHERE id = $1", [requestId]);
    expect(rows[0]).toEqual({ user_id: null, text: "Docker" });
    await pool.query("DELETE FROM subject_requests WHERE id = $1", [requestId]);
  });
});
