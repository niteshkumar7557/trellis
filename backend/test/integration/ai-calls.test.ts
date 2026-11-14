// ai_calls (migrations 0018 and 0019) against the real Postgres: the money count that
// every AI limit rests on. What is spent in each window, the UTC day and week boundaries,
// reserving and settling a call, that messages sent at the same moment can't get past a
// limit together, and what happens to a row when its student deletes their account.

import { afterAll, afterEach, describe, expect, it } from "vitest";
import type { Limits } from "../../src/ai/limits.js";
import { formatReport } from "../../src/db/ai-spend.js";
import pool from "../../src/db/index.js";
import { reserveAiCall, settleAiCall, spendFor, spendReport } from "../../src/repos/ai-calls.repo.js";
import { deleteUsers, registerStudent } from "./helpers.js";

const DOMAIN = "@ai-calls.test";
// This file's rows are told apart by a model name nothing else uses, so the clean-up
// can't touch real rows in the dev database.
const MODEL = "test-model-ai-calls";

// The dev database may already hold today's real calls, so the site's budget here is far
// above anything in it: these tests are about one account's limits unless they say otherwise.
const LIMITS: Limits = { siteDailyUsd: 1_000_000, userDailyUsd: 0.06, userWeeklyUsd: 0.25 };

// Cleared after EVERY test, not only at the end: a leftover row would count towards the
// site's spend in the next test.
afterEach(() => pool.query("DELETE FROM ai_calls WHERE model = $1", [MODEL]));
afterAll(() => deleteUsers(DOMAIN));

const reserve = (userId: number | null, reservedUsd = 0.0045, limits = LIMITS) =>
  reserveAiCall({ userId, model: MODEL, purpose: "read", reservedUsd }, limits);

const settled = (costUsd: number, over: Partial<Parameters<typeof settleAiCall>[1]> = {}) => ({
  inputTokens: 1700,
  outputTokens: 120,
  costUsd,
  latencyMs: 900,
  ok: true,
  error: null,
  ...over,
});

/** A finished call of this account, `ago` in the past (a Postgres interval), costing `usd`. */
const pastCall = (userId: number | null, usd: number, at: string) =>
  pool.query(`INSERT INTO ai_calls (user_id, model, purpose, cost_usd, latency_ms, ok, at) VALUES ($1, $2, 'read', $3, 10, true, ${at})`, [
    userId,
    MODEL,
    usd,
  ]);

const DAY_START = "date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'";
const WEEK_START = "date_trunc('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'";

/** Compared to 6 places, like the column, so float addition can't fail a test. */
const usd = (n: number) => n.toFixed(6);

describe("reserving and settling a call", () => {
  it("counts a reservation at once, at its worst case, and then at its real cost", async () => {
    const { userId } = await registerStudent(DOMAIN);
    const r = await reserve(userId, 0.0045);
    expect(r.blockedBy).toBeNull();

    // Pending: the limits already see the most it can cost.
    expect(usd((await spendFor(userId)).spend.userDay)).toBe(usd(0.0045));
    const pending = await pool.query("SELECT ok, error, cost_usd, reserved_usd FROM ai_calls WHERE id = $1", [r.id]);
    expect(pending.rows[0]).toMatchObject({ ok: false, error: "pending", cost_usd: null, reserved_usd: "0.004500" });

    // Settled: the real cost replaces the reservation.
    await settleAiCall(r.id!, settled(0.002147));
    const { spend } = await spendFor(userId);
    expect(usd(spend.userDay)).toBe(usd(0.002147));
    expect(usd(spend.userWeek)).toBe(usd(0.002147));
    const done = await pool.query("SELECT ok, error, input_tokens, latency_ms FROM ai_calls WHERE id = $1", [r.id]);
    expect(done.rows[0]).toEqual({ ok: true, error: null, input_tokens: 1700, latency_ms: 900 });
  });

  it("keeps counting a call that was never settled (the server died mid-call)", async () => {
    const { userId } = await registerStudent(DOMAIN);
    await reserve(userId, 0.0045);
    // No settleAiCall: nothing ever comes back for this row.
    expect(usd((await spendFor(userId)).spend.userDay)).toBe(usd(0.0045));
  });

  it("counts a refused call as nothing once it is settled so", async () => {
    const { userId } = await registerStudent(DOMAIN);
    const r = await reserve(userId, 0.0045);
    await settleAiCall(r.id!, settled(0, { inputTokens: null, outputTokens: null, ok: false, error: "throttled" }));
    expect((await spendFor(userId)).spend.userDay).toBe(0);
  });
});

describe("the limits", () => {
  it("refuses a call once the account's day is used, and writes no row for it", async () => {
    const { userId } = await registerStudent(DOMAIN);
    await pastCall(userId, 0.06, "NOW()");
    expect(await reserve(userId)).toEqual({ id: null, blockedBy: "day" });
    const { rows } = await pool.query("SELECT 1 FROM ai_calls WHERE user_id = $1 AND error = 'pending'", [userId]);
    expect(rows).toHaveLength(0);
  });

  it("refuses a call once the account's week is used, though today is empty", async () => {
    const { userId } = await registerStudent(DOMAIN);
    // Spent at the very start of this week. (On a Monday that is also today, and both
    // limits are reached: the week is still the one named.)
    await pastCall(userId, 0.25, WEEK_START);
    expect(await reserve(userId)).toEqual({ id: null, blockedBy: "week" });
  });

  it("keeps one account's spend away from another's", async () => {
    const a = await registerStudent(DOMAIN, "A");
    const b = await registerStudent(DOMAIN, "B");
    await pastCall(a.userId, 0.06, "NOW()");
    expect((await reserve(a.userId)).blockedBy).toBe("day");
    expect((await reserve(b.userId)).blockedBy).toBeNull();
    expect((await spendFor(b.userId)).spend.userWeek).toBeGreaterThan(0); // B's own reservation only
    expect(usd((await spendFor(b.userId)).spend.userWeek)).toBe(usd(0.0045));
  });

  it("refuses everyone once the site's day is spent, including the warm-up", async () => {
    const { userId } = await registerStudent(DOMAIN);
    const { spend } = await spendFor(null);
    // A site budget just above what today already holds, then one call that reaches it.
    const tight = { ...LIMITS, siteDailyUsd: spend.siteDay + 0.01 };
    await pastCall(null, 0.01, "NOW()");
    expect((await reserve(userId, 0.0045, tight)).blockedBy).toBe("site");
    expect((await reserve(null, 0.0045, tight)).blockedBy).toBe("site");
  });

  it("never holds the warm-up (no account) to an account's limit", async () => {
    // Even limits of zero for accounts don't stop a call that belongs to nobody.
    expect((await reserve(null, 0.0005, { ...LIMITS, userDailyUsd: 0, userWeeklyUsd: 0 })).blockedBy).toBeNull();
  });

  it("lets through only as many simultaneous calls as fit, however many arrive together", async () => {
    const { userId } = await registerStudent(DOMAIN);
    // 20 messages at the same instant, each reserving $0.0045, against $0.06 a day.
    // A call is allowed while the spend is BELOW the limit, so the 14th (at $0.0585) is
    // the last: 14 x 0.0045 = 0.063, one call's worth past the limit and no more.
    // Without the lock in reserveAiCall all 20 would see "nothing spent" and pass.
    const results = await Promise.all(Array.from({ length: 20 }, () => reserve(userId, 0.0045)));
    expect(results.filter((r) => r.blockedBy === null)).toHaveLength(14);
    expect(results.filter((r) => r.blockedBy === "day")).toHaveLength(6);
    expect(usd((await spendFor(userId)).spend.userDay)).toBe(usd(14 * 0.0045));
  });
});

describe("the windows", () => {
  it("does not count yesterday (UTC) in today, but does in the week unless it was last week", async () => {
    const { userId } = await registerStudent(DOMAIN);
    await pastCall(userId, 0.01, `${DAY_START} - INTERVAL '1 second'`);
    const { spend } = await spendFor(userId);
    expect(spend.userDay).toBe(0);
    // One second before today is still this week, except on a Monday (UTC), when it is
    // last week. Ask the database which it is, so the test is right on any day.
    const { rows } = await pool.query(`SELECT ${DAY_START} = ${WEEK_START} AS monday`);
    expect(usd(spend.userWeek)).toBe(usd(rows[0].monday ? 0 : 0.01));
  });

  it("does not count last week", async () => {
    const { userId } = await registerStudent(DOMAIN);
    await pastCall(userId, 0.2, `${WEEK_START} - INTERVAL '1 second'`);
    expect((await spendFor(userId)).spend.userWeek).toBe(0);
    expect((await reserve(userId)).blockedBy).toBeNull();
  });

  it("ends the day at the next midnight UTC and the week on the next Monday", async () => {
    const { windows } = await spendFor(null);
    const now = Date.now();
    expect(windows.dayEnds.toISOString()).toMatch(/T00:00:00\.000Z$/);
    expect(windows.dayEnds.getTime()).toBeGreaterThan(now);
    expect(windows.dayEnds.getTime() - now).toBeLessThanOrEqual(24 * 3600 * 1000);
    expect(windows.weekEnds.toISOString()).toMatch(/T00:00:00\.000Z$/);
    expect(windows.weekEnds.getUTCDay()).toBe(1); // Monday
    expect(windows.weekEnds.getTime()).toBeGreaterThan(now);
    expect(windows.weekEnds.getTime() - now).toBeLessThanOrEqual(7 * 24 * 3600 * 1000);
  });

  it("gives an account with no calls zeros, not an error", async () => {
    const { userId } = await registerStudent(DOMAIN);
    const { spend } = await spendFor(userId);
    expect(spend.userDay).toBe(0);
    expect(spend.userWeek).toBe(0);
  });
});

describe("the rest of the table", () => {
  it("keeps a deleted student's calls, without the student, so the site's budget still counts them", async () => {
    const { userId } = await registerStudent(DOMAIN);
    await pastCall(userId, 0.03, "NOW()");
    const before = (await spendFor(null)).spend.siteDay;
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    expect(usd((await spendFor(null)).spend.siteDay)).toBe(usd(before));
    const { rows } = await pool.query("SELECT user_id FROM ai_calls WHERE model = $1 AND user_id = $2", [MODEL, userId]);
    expect(rows).toHaveLength(0);
  });

  it("counts rows from before reservations existed as they always counted", async () => {
    const { userId } = await registerStudent(DOMAIN);
    // An old timed-out row: no cost and no reservation. It counted as 0 and still does.
    await pool.query("INSERT INTO ai_calls (user_id, model, purpose, latency_ms, ok, error) VALUES ($1, $2, 'read', 6000, false, 'timeout')", [
      userId,
      MODEL,
    ]);
    expect((await spendFor(userId)).spend.userDay).toBe(0);
  });

  it("refuses an unknown purpose", async () => {
    await expect(pool.query("INSERT INTO ai_calls (model, purpose, latency_ms, ok) VALUES ($1, 'chat', 1, true)", [MODEL])).rejects.toThrow(
      /check constraint/,
    );
  });
});

describe("the operator's report (npm run ai:spend)", () => {
  it("adds up each period and names accounts by id only", async () => {
    const { userId, email } = await registerStudent(DOMAIN);
    const before = await spendReport(1000);
    await pastCall(userId, 0.03, "NOW()");
    await pastCall(userId, 0.5, "NOW() - INTERVAL '40 days'"); // older than every period

    const report = await spendReport(1000);
    const period = (r: typeof report, label: string) => r.periods.find((p) => p.label === label)!;
    for (const label of ["today", "this week", "last 30 days"]) {
      expect(usd(period(report, label).usd), label).toBe(usd(period(before, label).usd + 0.03));
      expect(period(report, label).calls, label).toBe(period(before, label).calls + 1);
    }
    expect(report.topAccounts.find((a) => a.userId === userId)).toEqual({ userId, usdDay: 0.03, usdWeek: 0.03 });

    const text = formatReport(report).join("\n");
    expect(text).toContain(`#${userId}`);
    expect(text).not.toContain(email); // a money report, not a way to look anyone up
  });

  it("reports calls that were reserved and never settled", async () => {
    await pool.query(
      "INSERT INTO ai_calls (model, purpose, reserved_usd, latency_ms, ok, error, at) VALUES ($1, 'read', 0.0045, 0, false, 'pending', NOW() - INTERVAL '10 minutes')",
      [MODEL],
    );
    const report = await spendReport();
    expect(report.stuckPending).toBeGreaterThanOrEqual(1);
    expect(formatReport(report).join("\n")).toMatch(/never settled/);
  });
});
