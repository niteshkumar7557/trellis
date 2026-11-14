// ai_calls (migration 0018) against the real Postgres: today's spend, the UTC day
// boundary, and what happens to a row when its student deletes their account.

import { afterAll, describe, expect, it } from "vitest";
import pool from "../../src/db/index.js";
import { insertAiCall, spentTodayUsd } from "../../src/repos/ai-calls.repo.js";
import { deleteUsers, registerStudent } from "./helpers.js";

const DOMAIN = "@ai-calls.test";
// This file's rows are told apart by a model name nothing else uses, so the clean-up
// can't touch real rows in the dev database.
const MODEL = "test-model-ai-calls";

afterAll(async () => {
  await pool.query("DELETE FROM ai_calls WHERE model = $1", [MODEL]);
  await deleteUsers(DOMAIN);
});

const row = (over: Partial<Parameters<typeof insertAiCall>[0]> = {}) => ({
  userId: null,
  model: MODEL,
  purpose: "read" as const,
  inputTokens: 1700,
  outputTokens: 120,
  costUsd: 0.002501,
  latencyMs: 900,
  ok: true,
  error: null,
  ...over,
});

describe("ai_calls", () => {
  it("adds today's calls to today's spend, failed ones with a cost included", async () => {
    const before = await spentTodayUsd();
    await insertAiCall(row());
    await insertAiCall(row({ ok: false, error: "bad_output" })); // paid for, though unusable
    await insertAiCall(row({ ok: false, error: "timeout", inputTokens: null, outputTokens: null, costUsd: null }));
    // Compared to 6 places, like the column, so float addition can't fail the test.
    expect((await spentTodayUsd()).toFixed(6)).toBe((before + 0.005002).toFixed(6));
  });

  it("does not count yesterday (UTC)", async () => {
    const before = await spentTodayUsd();
    await pool.query(
      `INSERT INTO ai_calls (model, purpose, cost_usd, latency_ms, ok, at)
       VALUES ($1, 'read', 1, 10, true, date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' - INTERVAL '1 second')`,
      [MODEL],
    );
    expect(await spentTodayUsd()).toBe(before);
  });

  it("keeps a deleted student's calls, without the student, so the budget still counts them", async () => {
    const { userId } = await registerStudent(DOMAIN);
    await insertAiCall(row({ userId }));
    const before = await spentTodayUsd();
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    expect(await spentTodayUsd()).toBe(before);
    const { rows } = await pool.query("SELECT user_id FROM ai_calls WHERE model = $1 AND user_id = $2", [MODEL, userId]);
    expect(rows).toHaveLength(0);
  });

  it("refuses an unknown purpose", async () => {
    await expect(pool.query("INSERT INTO ai_calls (model, purpose, latency_ms, ok) VALUES ($1, 'chat', 1, true)", [MODEL])).rejects.toThrow(
      /check constraint/,
    );
  });
});
