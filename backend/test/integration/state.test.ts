// GET /api/state, GET /api/export and DELETE /api/me against the real Postgres, on a
// student with something in every part of the record.

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import pool from "../../src/db/index.js";
import { deleteUsers, insertSavedCheckIn, insertSavedExperience, registerStudent } from "./helpers.js";

const DOMAIN = "@it-state.trellis.test";
let ada: Awaited<ReturnType<typeof registerStudent>>;
let saved: Awaited<ReturnType<typeof insertSavedCheckIn>>;
let requestId = "";

/** A helper message in the redis thread at a given minute, so the order is certain. */
const insertMessage = (userId: number, minute: number, extra: { cards?: unknown } = {}) =>
  pool.query(
    `INSERT INTO chat_messages (user_id, subject_id, role, text, cards, at)
     VALUES ($1, 'redis', 'helper', $2, $3, '2026-11-01T00:00:00Z'::timestamptz + make_interval(mins => $4))
     RETURNING id`,
    [userId, `message ${minute}`, extra.cards ? JSON.stringify(extra.cards) : null, minute],
  );

beforeAll(async () => {
  await deleteUsers(DOMAIN);
  ada = await registerStudent(DOMAIN, "Ada");
  const a = ada.auth;
  await request(app).put("/api/goals/react-native").set(a).send({ goalId: "goal-rn-first-app" });
  await request(app).post("/api/claims").set(a).send({ claims: [{ topicId: "rn-intro", claim: "shaky" }] });
  await request(app).post("/api/opened").set(a).send({ topicId: "rn-react" });
  await request(app).post("/api/prompt-takes").set(a).send({ topicId: "rn-what", via: "copy" });
  await request(app).post("/api/subject-requests").set(a).send({ text: "Docker" });
  requestId = (await pool.query("SELECT id FROM subject_requests WHERE user_id = $1", [ada.userId])).rows[0].id;
  saved = await insertSavedCheckIn(ada.userId, "rn-what", "got", "got it");
  await insertSavedExperience(ada.userId, "rn-what", "clicked", "the docs example made it click");
});
afterAll(async () => {
  await deleteUsers(DOMAIN);
  await pool.query("DELETE FROM subject_requests WHERE id = $1", [requestId]);
  await pool.end();
});

describe("GET /api/state", () => {
  it("returns the whole record in the store's shape", async () => {
    const res = await request(app).get("/api/state").set(ada.auth);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    const s = res.body;
    expect(Object.keys(s).sort()).toEqual(
      ["checkIns", "claims", "experiences", "goalIds", "messages", "moreMessages", "opened", "promptTakes", "student", "usage"].sort(),
    );
    // The AI allowance rides along (test/integration/ai-limits.test.ts covers its numbers).
    // These tests run with the AI off, so there is nothing used and no limit to report.
    expect(s.usage).toEqual({
      on: false,
      day: { usedPct: 0, resetsAt: expect.any(String) },
      week: { usedPct: 0, resetsAt: expect.any(String) },
      basic: null,
    });
    expect(s.student.email).toBe(ada.email);
    expect(s.goalIds).toEqual({ "react-native": "goal-rn-first-app" });
    expect(s.claims).toEqual([{ topicId: "rn-intro", claim: "shaky", at: expect.any(String) }]);
    expect(s.opened).toEqual(["rn-react"]);
    expect(s.promptTakes).toHaveLength(1);
    expect(s.checkIns.map((c: { topicId: string }) => c.topicId)).toEqual(["rn-what", "rn-what"]);
    expect(s.experiences[0]).toMatchObject({ kind: "clicked", topicId: "rn-what" });
    expect(s.moreMessages).toEqual({ "react-native": false, redis: false });
  });

  it("fills a confirm card from its proposal, with the ids it saved", async () => {
    await pool.query("UPDATE chat_messages SET cards = $2 WHERE id = $1", [
      saved.messageId,
      JSON.stringify([{ type: "confirm", proposalId: saved.proposalId }, { type: "suggest", options: ["What next?"] }]),
    ]);
    await pool.query("UPDATE proposals SET payload = $2 WHERE id = $1", [
      saved.proposalId,
      JSON.stringify({ updates: [{ topicId: "rn-what", outcome: "got" }], experiences: [], said: "got it" }),
    ]);

    const { body } = await request(app).get("/api/state").set(ada.auth);
    const message = body.messages.find((m: { id: string }) => m.id === saved.messageId);
    expect(message.cards).toEqual([
      {
        type: "confirm",
        proposalId: saved.proposalId,
        proposal: { updates: [{ topicId: "rn-what", outcome: "got" }], experiences: [], said: "got it" },
        state: "saved",
        saved: { checkIns: [saved.checkInId], experiences: [] },
      },
      { type: "suggest", options: ["What next?"] },
    ]);
  });

  it("sends the latest 50 messages per subject, oldest first, and says there are more", async () => {
    for (let minute = 1; minute <= 52; minute++) await insertMessage(ada.userId, minute);
    const { body } = await request(app).get("/api/state").set(ada.auth);
    const redis = body.messages.filter((m: { subjectId: string }) => m.subjectId === "redis");
    expect(redis).toHaveLength(50);
    expect(redis[0].text).toBe("message 3"); // 1 and 2 are the older page
    expect(redis[49].text).toBe("message 52");
    expect(body.moreMessages.redis).toBe(true);
  });

  it("never shows another student's record", async () => {
    const bob = await registerStudent(DOMAIN, "Bob");
    const { body } = await request(app).get("/api/state").set(bob.auth);
    expect(body.checkIns).toEqual([]);
    expect(body.messages).toEqual([]);
    expect(body.claims).toEqual([]);
  });
});

describe("GET /api/export", () => {
  it("downloads everything, unpaged, and never a password or token hash", async () => {
    const res = await request(app).get("/api/export").set(ada.auth);
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toMatch(/^attachment; filename="trellis-export-\d{4}-\d{2}-\d{2}\.json"$/);
    expect(res.body.account).toMatchObject({ email: ada.email, hasPassword: true, signsInWithGoogle: false });
    expect(res.body.messages.redis).toHaveLength(52); // all of them, not 50
    expect(res.body.subjectRequests).toEqual([{ text: "Docker", at: expect.any(String) }]);

    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/\$2b\$/); // a bcrypt hash
    expect(text).not.toContain("hashed_password");
    expect(text).not.toContain("token_hash");
  });
});

describe("DELETE /api/me", () => {
  it("refuses a wrong password, then deletes everything with the right one", async () => {
    const wrong = await request(app).delete("/api/me").set(ada.auth).send({ password: "nope" });
    expect(wrong.status).toBe(403);

    const res = await request(app).delete("/api/me").set(ada.auth).send({ password: "correct horse" });
    expect(res.status).toBe(204);

    for (const table of ["users", "student_goals", "claims", "opened_topics", "check_ins", "experiences", "prompt_takes", "chat_messages", "proposals", "refresh_tokens"]) {
      const column = table === "users" ? "id" : "user_id";
      const { rows } = await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE ${column} = $1`, [ada.userId]);
      expect(rows[0].n, table).toBe(0);
    }

    // The old session can't come back: its refresh token went with the account.
    const token = ada.refreshCookie.split(";")[0]!;
    expect((await request(app).post("/api/auth/refresh").set("Cookie", token)).status).toBe(401);
    // The access token still verifies for a few minutes, but finds nothing.
    expect((await request(app).get("/api/state").set(ada.auth)).status).toBe(404);
  });
});
