// Conversations with the helper against the real Postgres: the reply is stored with the
// message, a confirm card gets a proposal row, a new proposal cancels the old one, and
// history pages backwards. Nothing in here may create a check-in: only Save (M4.3) does.

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import pool from "../../src/db/index.js";
import { deleteUsers, registerStudent } from "./helpers.js";

const DOMAIN = "@it-helper.trellis.test";
let ada: Awaited<ReturnType<typeof registerStudent>>;

const say = (text: string, subject = "react-native", who = ada) =>
  request(app).post(`/api/helper/${subject}/messages`).set(who.auth).send({ text });
const count = async (table: string) =>
  (await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE user_id = $1`, [ada.userId])).rows[0].n;

beforeAll(async () => {
  await deleteUsers(DOMAIN);
  ada = await registerStudent(DOMAIN, "Ada");
  await request(app).put("/api/goals/react-native").set(ada.auth).send({ goalId: "goal-rn-first-app" });
});
afterAll(async () => {
  await deleteUsers(DOMAIN);
  await pool.end();
});

describe("a conversation", () => {
  it("asks one question about how it went, and stores both messages", async () => {
    const res = await say("I finished Components");
    expect(res.status).toBe(201);
    const [student, helper] = res.body.messages;
    expect(student).toMatchObject({ role: "student", text: "I finished Components", subjectId: "react-native" });
    expect(helper.role).toBe("helper");
    expect(helper.asks).toMatchObject({ kind: "easy", pending: { updates: [{ outcome: "got" }] } });
    // clock_timestamp(): the reply comes after. Compared in Postgres, at microseconds:
    // the JSON times are cut to milliseconds, and two inserts can share one.
    const { rows } = await pool.query(
      "SELECT (SELECT at FROM chat_messages WHERE id = $1) < (SELECT at FROM chat_messages WHERE id = $2) AS after",
      [student.id, helper.id],
    );
    expect(rows[0].after).toBe(true);
    expect(await count("proposals")).toBe(0); // a question is not a proposal yet
  });

  it("turns the answer into a confirm card backed by a proposal row, and saves nothing", async () => {
    const res = await say("the setup was easy, but styling took ages");
    const card = res.body.messages[1].cards[0];
    expect(card).toMatchObject({ type: "confirm", state: "open", proposalId: expect.any(String) });
    expect(card.proposal.experiences.map((e: { kind: string }) => e.kind)).toEqual(["easy", "hard"]);

    const { rows } = await pool.query("SELECT state, message_id FROM proposals WHERE id = $1", [card.proposalId]);
    expect(rows[0]).toEqual({ state: "open", message_id: res.body.messages[1].id });
    expect(await count("check_ins")).toBe(0);
    expect(await count("experiences")).toBe(0);
  });

  it("cancels the older open proposal when a new one is made", async () => {
    const tap = await request(app)
      .post("/api/helper/react-native/messages")
      .set(ada.auth)
      .send({ pick: { outcome: "partly", topicIds: ["rn-what", "rn-why"], label: "Partly" } });
    expect(tap.status).toBe(201);
    expect(tap.body.messages[0].text).toBe("Partly");

    const { rows } = await pool.query("SELECT state FROM proposals WHERE user_id = $1 ORDER BY created_at", [ada.userId]);
    expect(rows.map((r) => r.state)).toEqual(["cancelled", "open"]);

    // The older card now reads as cancelled too, because cards are filled from the table.
    const state = await request(app).get("/api/state").set(ada.auth);
    const states = state.body.messages.flatMap((m: { cards?: { type: string; state: string }[] }) =>
      (m.cards ?? []).filter((c) => c.type === "confirm").map((c) => c.state),
    );
    expect(states).toEqual(["cancelled", "open"]);
  });

  it("records who read each student message", async () => {
    const { rows } = await pool.query(
      "SELECT read_by FROM chat_messages WHERE user_id = $1 AND role = 'student' ORDER BY at",
      [ada.userId],
    );
    expect(rows.map((r) => r.read_by)).toEqual(["rules", "rules", "tap"]);
  });

  it("answers 'explain' with a prompt card and no proposal", async () => {
    const res = await say("explain props");
    expect(res.body.messages[1].cards).toEqual([{ type: "prompt", topicId: expect.any(String) }]);
  });

  it("keeps each subject's thread, and each student's, apart", async () => {
    await say("what's next", "redis");
    const bob = await registerStudent(DOMAIN, "Bob");
    const rn = await request(app).get("/api/helper/react-native/messages").set(ada.auth);
    expect(rn.body.messages.every((m: { subjectId: string }) => m.subjectId === "react-native")).toBe(true);
    const bobs = await request(app).get("/api/helper/react-native/messages").set(bob.auth);
    expect(bobs.body).toEqual({ messages: [], more: false });
  });
});

describe("paging history", () => {
  it("walks backwards with a cursor, without gaps or repeats", async () => {
    const carol = await registerStudent(DOMAIN, "Carol");
    for (let i = 1; i <= 7; i++) await say(`hello ${i}`, "redis", carol);
    // 14 messages: 7 from the student, 7 replies.
    const url = "/api/helper/redis/messages";
    const first = await request(app).get(`${url}?limit=5`).set(carol.auth);
    expect(first.body.more).toBe(true);
    const second = await request(app).get(`${url}?limit=5&before=${first.body.messages[0].id}`).set(carol.auth);
    const third = await request(app).get(`${url}?limit=5&before=${second.body.messages[0].id}`).set(carol.auth);
    expect(third.body.more).toBe(false);

    const all = [...third.body.messages, ...second.body.messages, ...first.body.messages];
    expect(all).toHaveLength(14);
    expect(new Set(all.map((m: { id: string }) => m.id)).size).toBe(14);
    expect(all[0].text).toBe("hello 1");
  });
});

describe("the daily limit on typed messages", () => {
  /** Writes `n` student messages directly, as if typed (or tapped) at `at`. */
  const fill = (userId: number, n: number, readBy: string, at = "clock_timestamp()") =>
    pool.query(
      `INSERT INTO chat_messages (user_id, subject_id, role, text, read_by, at)
       SELECT $1, 'redis', 'student', 'filler', $2, ${at} FROM generate_series(1, $3)`,
      [userId, readBy, n],
    );

  it("counts today's typed messages in every subject, not taps or yesterday's, and stops at 100", async () => {
    const dan = await registerStudent(DOMAIN, "Dan");
    await fill(dan.userId, 50, "rules");
    await fill(dan.userId, 49, "model");
    await fill(dan.userId, 30, "tap"); // taps never count
    // Yesterday (UTC) doesn't count either.
    await fill(dan.userId, 30, "rules", "date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' - INTERVAL '1 minute'");

    // 99 so far: the 100th is taken, in another subject.
    expect((await say("what's next", "react-native", dan)).status).toBe(201);
    const over = await say("what's next", "react-native", dan);
    expect(over.status).toBe(429);
    expect(over.body.error.code).toBe("daily_limit");

    // A tap still works at the limit: marking a topic must never be blocked.
    const tap = await request(app)
      .post("/api/helper/react-native/messages")
      .set(dan.auth)
      .send({ pick: { outcome: "got", topicIds: ["rn-state"], label: "Got it" } });
    expect(tap.status).toBe(201);
  });
});
