// Model calls (ai_calls, migration 0018). Numbers only: no message text is ever stored.

import pool from "../db/index.js";

export interface AiCallRow {
  userId: number | null;
  model: string;
  purpose: "read" | "warmup";
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  latencyMs: number;
  ok: boolean;
  error: string | null;
}

export async function insertAiCall(c: AiCallRow): Promise<void> {
  await pool.query(
    `INSERT INTO ai_calls (user_id, model, purpose, input_tokens, output_tokens, cost_usd, latency_ms, ok, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [c.userId, c.model, c.purpose, c.inputTokens, c.outputTokens, c.costUsd, c.latencyMs, c.ok, c.error],
  );
}

/**
 * Dollars spent on the model since midnight UTC, by everyone. The daily budget compares
 * against this before every call.
 *
 * Why midnight UTC and not India time: the AWS bill and Bedrock's own counters reset at
 * UTC midnight, so the two line up when you compare them. For students in India the
 * budget resets at 5:30 in the morning, when almost nobody is studying.
 */
export async function spentTodayUsd(): Promise<number> {
  const { rows } = await pool.query<{ spent: string }>(
    // date_trunc on the UTC wall clock, then back to a timestamptz: "today 00:00 UTC".
    // COALESCE: SUM of no rows is NULL, and the first call of the day must see 0.
    `SELECT COALESCE(SUM(cost_usd), 0) AS spent FROM ai_calls
     WHERE at >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
  );
  // NUMERIC comes back from pg as a string, so precision isn't lost on the way.
  return Number(rows[0]!.spent);
}
