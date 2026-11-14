// The AI limits from end to end: a typed message through the real API and the real
// Postgres, with only Bedrock itself faked (no network, no AWS account, no money).
// What a student is told at each step, and that at a limit the helper keeps answering
// without a model call.

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { costUsd } from "../../src/ai/limits.js";
import app from "../../src/app.js";
import pool from "../../src/db/index.js";
import { deleteUsers, registerStudent } from "./helpers.js";

// The AI is ON for this file only (the integration tests' default is off), and the SDK is
// replaced, so "on" can never reach the real Bedrock. The site's budget is set far above
// whatever real calls the dev database holds for today, so these tests are about one
// account's allowance. vi.hoisted runs before the imports above, so config/index.ts sees
// the variables when it first loads; dotenv never overwrites one that is already set.
const { send } = vi.hoisted(() => {
  process.env.AI_PROVIDER = "bedrock";
  process.env.AI_DAILY_BUDGET_USD = "1000000";
  process.env.AI_USER_DAILY_USD = "0.06";
  process.env.AI_USER_WEEKLY_USD = "0.25";
  return { send: vi.fn() };
});
vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
  BedrockRuntimeClient: class {
    send = send;
  },
  ConverseCommand: class {
    constructor(public input: unknown) {}
  },
}));

const DOMAIN = "@it-ai-limits.trellis.test";
const URL = "/api/helper/react-native/messages";
let ada: Awaited<ReturnType<typeof registerStudent>>;

/** What GLM 5 answers for "what's next?": 1,700 tokens in, 120 out, as measured. */
const reading = {
  output: { message: { role: "assistant", content: [{ text: JSON.stringify({ path: "next", topicIds: [], bigId: null, outcome: null, experiences: [], help: null }) }] } },
  stopReason: "end_turn",
  usage: { inputTokens: 1700, outputTokens: 120 },
};
const ONE_MESSAGE = costUsd(1700, 120); // $0.002147

const say = (text: string, who = ada) => request(app).post(URL).set(who.auth).send({ text });
const readBy = async (who = ada) =>
  (await pool.query("SELECT read_by FROM chat_messages WHERE user_id = $1 AND role = 'student' ORDER BY at DESC LIMIT 1", [who.userId])).rows[0].read_by;
// Every ai_calls row this file makes, so the clean-up can remove exactly those. Deleting
// an account does NOT remove its calls (user_id becomes NULL, on purpose), so the rows
// have to be remembered by their own ids: there is nothing else left to find them by.
const madeRows: string[] = [];
const rememberCallsOf = async (userId: number) => {
  const { rows } = await pool.query<{ id: string }>("SELECT id FROM ai_calls WHERE user_id = $1", [userId]);
  madeRows.push(...rows.map((r) => r.id));
};

/** A finished call of this account costing `usd`, at a time given as SQL. */
const spent = (usd: number, at = "NOW()", who = ada) =>
  pool.query(`INSERT INTO ai_calls (user_id, model, purpose, cost_usd, latency_ms, ok, at) VALUES ($1, 'zai.glm-5', 'read', $2, 10, true, ${at})`, [
    who.userId,
    usd,
  ]);

/** Removes this file's accounts and every model call they made. */
async function cleanUp() {
  const { rows } = await pool.query<{ id: number }>("SELECT id FROM users WHERE email LIKE $1", [`%${DOMAIN}`]);
  for (const u of rows) await rememberCallsOf(u.id);
  await pool.query("DELETE FROM ai_calls WHERE id = ANY($1::bigint[])", [madeRows]);
  await deleteUsers(DOMAIN);
}

beforeAll(cleanUp); // whatever a crashed earlier run left behind
beforeEach(async () => {
  // A fresh account for each test: its allowance starts empty.
  vi.clearAllMocks();
  send.mockResolvedValue(reading);
  ada = await registerStudent(DOMAIN, "Ada");
  await request(app).put("/api/goals/react-native").set(ada.auth).send({ goalId: "goal-rn-first-app" });
});
afterAll(async () => {
  await cleanUp();
  await pool.end();
});

describe("a typed message under the limits", () => {
  it("is read by the model, counted at its real cost, and answered with the new percentage", async () => {
    const res = await say("what's next?");
    expect(res.status).toBe(201);
    expect(send).toHaveBeenCalledTimes(1);
    expect(await readBy()).toBe("model");
    // $0.002147 of $0.06 a day is 4%; of $0.25 a week, 1%.
    expect(res.body.usage).toEqual({
      on: true,
      day: { usedPct: 4, resetsAt: expect.stringMatching(/T00:00:00\.000Z$/) },
      week: { usedPct: 1, resetsAt: expect.stringMatching(/T00:00:00\.000Z$/) },
      basic: null,
    });

    const { rows } = await pool.query("SELECT cost_usd, reserved_usd, ok, error, input_tokens FROM ai_calls WHERE user_id = $1", [ada.userId]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ cost_usd: ONE_MESSAGE.toFixed(6), ok: true, error: null, input_tokens: 1700 });
    // What was held while the call ran was more than it turned out to cost.
    expect(Number(rows[0].reserved_usd)).toBeGreaterThan(ONE_MESSAGE);
  });

  it("never sends a dollar amount to the browser", async () => {
    const res = await say("what's next?");
    expect(res.text).not.toMatch(/usd|cost|0\.002|0\.06|0\.25/i);
    const usage = await request(app).get("/api/usage").set(ada.auth);
    expect(usage.text).not.toMatch(/usd|cost|0\.002|0\.06|0\.25/i);
  });

  it("doesn't call the model for a tap, and a tap uses nothing", async () => {
    const res = await request(app)
      .post(URL)
      .set(ada.auth)
      .send({ pick: { outcome: "got", topicIds: ["rn-state"], label: "Got it" } });
    expect(res.status).toBe(201);
    expect(send).not.toHaveBeenCalled();
    expect(res.body.usage.day.usedPct).toBe(0);
  });
});

describe("at a limit", () => {
  it("keeps answering in basic mode once the day is used: no model call, no error", async () => {
    await spent(0.06);
    const res = await say("what's next?");
    expect(res.status).toBe(201); // nothing is refused
    expect(res.body.messages[1].text).toMatch(/^Next up: /); // the rules read it
    expect(send).not.toHaveBeenCalled();
    expect(await readBy()).toBe("rules");
    expect(res.body.usage).toMatchObject({ day: { usedPct: 100 }, week: { usedPct: 24 }, basic: "day" });
    // And no row was added for a call that was never made.
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM ai_calls WHERE user_id = $1", [ada.userId]);
    expect(rows[0].n).toBe(1);
  });

  it("holds through the week, whatever today looks like", async () => {
    await spent(0.25, "date_trunc('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'");
    const res = await say("what's next?");
    expect(send).not.toHaveBeenCalled();
    expect(res.body.usage).toMatchObject({ week: { usedPct: 100 }, basic: "week" });
  });

  it("lets the last message through and stops the one after it", async () => {
    // Just under the daily limit: this message is still read by the model...
    await spent(0.0595);
    expect((await say("what's next?")).body.usage).toMatchObject({ day: { usedPct: 100 }, basic: "day" });
    expect(send).toHaveBeenCalledTimes(1);
    // ...and it took the account past the limit by one message, so the next is not.
    await say("and after that?");
    expect(send).toHaveBeenCalledTimes(1);
    expect(await readBy()).toBe("rules");
  });

  it("is one account's limit only: a classmate's messages are still read by the model", async () => {
    await spent(0.06);
    const bob = await registerStudent(DOMAIN, "Bob");
    await request(app).put("/api/goals/react-native").set(bob.auth).send({ goalId: "goal-rn-first-app" });
    const res = await say("what's next?", bob);
    expect(send).toHaveBeenCalledTimes(1);
    expect(res.body.usage.basic).toBeNull();
  });

  it("sends only one of a burst of messages to the model when there is room for one", async () => {
    // Bedrock takes about 2 seconds, so a burst really does overlap: hold each fake call
    // open long enough for all ten requests to arrive while the first is still running.
    send.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(reading), 400)));
    // $0.057 used. The first message passes ($0.057 is under $0.06) and reserves about
    // $0.0043 while it runs, which takes the pending total past the limit. So the other
    // nine see no room and are read by the rules: one model call for ten messages.
    // Without the reservation all ten would have seen $0.057 and been sent.
    await spent(0.057);
    const burst = await Promise.all(Array.from({ length: 10 }, (_, i) => say(`what's next? ${i}`)));
    expect(burst.every((r) => r.status === 201)).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("a call that goes wrong", () => {
  it("counts a timed-out call at its whole reservation, since nobody knows what it was billed", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    send.mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    const res = await say("what's next?");
    expect(res.status).toBe(201); // the rules answered
    expect(await readBy()).toBe("rules");
    const { rows } = await pool.query("SELECT cost_usd, reserved_usd, error FROM ai_calls WHERE user_id = $1", [ada.userId]);
    expect(rows[0].error).toBe("timeout");
    expect(rows[0].cost_usd).toBe(rows[0].reserved_usd);
    expect(res.body.usage.day.usedPct).toBeGreaterThan(4); // more than a normal message
    log.mockRestore();
  });

  it("counts nothing for a call Bedrock refused outright", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    send.mockRejectedValue(Object.assign(new Error("Too many requests"), { name: "ThrottlingException" }));
    const res = await say("what's next?");
    expect(res.body.usage.day.usedPct).toBe(0);
    log.mockRestore();
  });
});

describe("reading the usage", () => {
  it("answers the same numbers from GET /api/usage and GET /api/state", async () => {
    await spent(0.03);
    const usage = await request(app).get("/api/usage").set(ada.auth);
    expect(usage.status).toBe(200);
    expect(usage.body).toMatchObject({ on: true, day: { usedPct: 50 }, week: { usedPct: 12 }, basic: null });
    const state = await request(app).get("/api/state").set(ada.auth);
    expect(state.body.usage).toEqual(usage.body);
  });

  it("starts from zero again after the account is deleted and made anew (the owner's call)", async () => {
    // Deleting removes every link between the spend and the person, as the privacy
    // promise says. The price: a new account with the same email has a full allowance.
    // The site's daily budget still counted the old spend.
    await spent(0.06);
    await rememberCallsOf(ada.userId); // after the delete nothing links the row to this test
    await request(app).delete("/api/me").set(ada.auth).send({ password: "correct horse" });
    const again = await request(app).post("/api/auth/register").send({ name: "Ada", email: ada.email, password: "correct horse" });
    const usage = await request(app).get("/api/usage").set({ Authorization: `Bearer ${again.body.accessToken}` });
    expect(usage.body).toMatchObject({ day: { usedPct: 0 }, week: { usedPct: 0 }, basic: null });
  });
});
