// The student's record against the real Postgres, and what happens to it when the
// account is deleted.

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

describe("deleting the account", () => {
  it("deletes the whole record with it", async () => {
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    for (const table of ["student_goals", "refresh_tokens"]) {
      const { rows } = await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE user_id = $1`, [userId]);
      expect(rows[0].n, table).toBe(0);
    }
  });
});
