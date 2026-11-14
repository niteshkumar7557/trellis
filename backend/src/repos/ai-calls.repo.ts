// Model calls (ai_calls, migrations 0018 and 0019). Numbers only: no message text is ever
// stored.
//
// This table is also the money count. Every limit (src/ai/limits.ts) is a SUM over it, so
// there is one source of truth and a restart resets nothing. A call's life here:
//
//   reserveAiCall()  BEFORE the call: checks the limits and inserts the row, holding the
//                    most the call can cost. Refuses instead if a limit is reached.
//   settleAiCall()   AFTER the call: writes what it really cost.
//
// A row that is never settled (the server died mid-call) keeps counting at its reserved
// amount until its day and week have passed: too much, never too little.

import type { PoolClient } from "pg";
import { blockedBy, type Blocked, type Limits, type Spend, type Windows } from "../ai/limits.js";
import pool, { inTransaction } from "../db/index.js";

type Db = Pick<PoolClient, "query">;

// What one row counts for: its real cost once settled, its reservation while pending.
// Rows from before migration 0019 that never had a cost count as 0, as they always did.
const CHARGED = "COALESCE(a.cost_usd, a.reserved_usd, 0)";

// The windows, worked out by the DATABASE's clock so every query agrees on them.
//
// Why midnight UTC and not India time: the AWS bill and Bedrock's own counters reset at
// UTC midnight, so the two line up when you compare them. For students in India a day
// resets at 5:30 in the morning, when almost nobody is studying, and a week on Monday at
// 5:30 (Postgres's 'week' is the ISO week, which starts on Monday).
//
// Why fixed windows and not "the last 24 hours": a fixed window has one reset time that
// the screen can state. A rolling one gives each message back at a different moment.
//
// `NOW() AT TIME ZONE 'UTC'` is the UTC wall clock; the outer AT TIME ZONE turns the
// truncated wall time back into a real instant. The "+ 1 day" is added to the wall time,
// before converting, so the session's own time zone can never shift it.
const WINDOWS = `
  SELECT date_trunc('day',  NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS day_start,
         date_trunc('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS week_start,
         (date_trunc('day',  NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day')  AT TIME ZONE 'UTC' AS day_ends,
         (date_trunc('week', NOW() AT TIME ZONE 'UTC') + INTERVAL '7 days') AT TIME ZONE 'UTC' AS week_ends`;

/**
 * What the site has spent today, and what one account has spent today and this week.
 *
 * `userId` null (the server's warm-up call) gives 0 for the account's sums: in SQL
 * `user_id = NULL` is never true. Calls of deleted accounts have user_id NULL too, so they
 * still count for the site and for nobody else.
 *
 * The LEFT JOIN keeps the one row of windows even when there are no calls at all, and the
 * join condition reads only this week's rows of this account plus today's rows of everyone.
 */
export async function spendFor(userId: number | null, db: Db = pool): Promise<{ spend: Spend; windows: Windows }> {
  const { rows } = await db.query<{ site_day: string; user_day: string; user_week: string; day_ends: Date; week_ends: Date }>(
    `WITH w AS (${WINDOWS})
     SELECT COALESCE(SUM(${CHARGED}) FILTER (WHERE a.at >= w.day_start), 0)                    AS site_day,
            COALESCE(SUM(${CHARGED}) FILTER (WHERE a.user_id = $1 AND a.at >= w.day_start), 0) AS user_day,
            COALESCE(SUM(${CHARGED}) FILTER (WHERE a.user_id = $1), 0)                         AS user_week,
            w.day_ends, w.week_ends
     FROM w
     LEFT JOIN ai_calls a ON a.at >= w.week_start AND (a.user_id = $1 OR a.at >= w.day_start)
     GROUP BY w.day_ends, w.week_ends`,
    [userId],
  );
  const r = rows[0]!;
  return {
    // NUMERIC comes back from pg as a string, so precision isn't lost on the way.
    spend: { siteDay: Number(r.site_day), userDay: Number(r.user_day), userWeek: Number(r.user_week) },
    windows: { dayEnds: r.day_ends, weekEnds: r.week_ends },
  };
}

export interface Reserve {
  /** Whose message this reads. Null for the server's own warm-up call. */
  userId: number | null;
  model: string;
  purpose: "read" | "warmup";
  /** The most this call can cost (worstCaseUsd in src/ai/limits.ts). */
  reservedUsd: number;
}

/** Either the new row's id, or the limit that refused the call. */
export type Reservation = { id: string; blockedBy: null } | { id: null; blockedBy: Blocked };

// Any constant works as the key; it only has to be the same in every reservation and
// used by nothing else in this database. (It spells "AI" in ASCII: 0x41 0x49.)
const RESERVE_LOCK = 0x4149;

/**
 * Checks the limits and, if the call may go ahead, inserts its row. One transaction,
 * under one lock, so that "add up the spend" and "add this call to it" can't interleave
 * with another reservation.
 *
 * Why a lock at all: without it, ten messages sent at the same moment would each add up
 * the same old spend, each see room, and all ten would be sent. With it they queue: the
 * second one sees the first one's reservation.
 *
 * Why ONE lock for the whole site and not one per account: the site's daily budget is
 * shared, so two different accounts can race for its last cent too. The lock is held for
 * two small queries (a few milliseconds); the Bedrock call itself runs outside it.
 * The alternative, a running total in its own row, is quicker to read but is a second
 * copy of the truth that can drift away from ai_calls.
 *
 * Throws if the database fails. The caller then makes NO model call (src/ai/bedrock.ts):
 * money is never spent on a call we could not write down first.
 */
export async function reserveAiCall(c: Reserve, limits: Limits): Promise<Reservation> {
  return inTransaction(async (db) => {
    // If the lock can't be had in 2 seconds something is badly stuck; give up (the rules
    // read the message) rather than hold the student's request open. SET LOCAL lasts for
    // this transaction only. pg_advisory_xact_lock is released by COMMIT or ROLLBACK.
    await db.query("SET LOCAL lock_timeout = '2s'");
    await db.query("SELECT pg_advisory_xact_lock($1::bigint)", [RESERVE_LOCK]);

    const { spend } = await spendFor(c.userId, db);
    const blocked = blockedBy(spend, limits, c.userId !== null);
    if (blocked) return { id: null, blockedBy: blocked };

    // ok = false and error = 'pending' until settleAiCall() says how it went.
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO ai_calls (user_id, model, purpose, reserved_usd, latency_ms, ok, error)
       VALUES ($1, $2, $3, $4, 0, false, 'pending') RETURNING id`,
      [c.userId, c.model, c.purpose, c.reservedUsd],
    );
    return { id: rows[0]!.id, blockedBy: null };
  });
}

export interface Settle {
  inputTokens: number | null;
  outputTokens: number | null;
  /** What the call counts as (chargeFor in src/ai/limits.ts). Always a number. */
  costUsd: number;
  latencyMs: number;
  ok: boolean;
  error: string | null;
}

/** Writes how a reserved call went. From here on the limits count cost_usd for it. */
export async function settleAiCall(id: string, s: Settle): Promise<void> {
  await pool.query(
    `UPDATE ai_calls
     SET input_tokens = $2, output_tokens = $3, cost_usd = $4, latency_ms = $5, ok = $6, error = $7
     WHERE id = $1`,
    [id, s.inputTokens, s.outputTokens, s.costUsd, s.latencyMs, s.ok, s.error],
  );
}

// ---------------------------------------------------------------- the operator's report

export interface SpendReport {
  /** One row per period: today, this week, the last 30 days. */
  periods: { label: string; calls: number; usd: number }[];
  /** The accounts that spent most this week, by id only. */
  topAccounts: { userId: number; usdDay: number; usdWeek: number }[];
  /** Calls reserved more than 5 minutes ago and never settled: the server stopped mid-call. */
  stuckPending: number;
}

/**
 * What the AI has cost, for `npm run ai:spend` (src/db/ai-spend.ts). Account ids only:
 * no names, no emails, and there is no message text in this table to show.
 */
export async function spendReport(top = 10): Promise<SpendReport> {
  const periods = await pool.query<{ label: string; calls: number; usd: string }>(
    `WITH w AS (${WINDOWS})
     SELECT p.label, COUNT(a.id)::int AS calls, COALESCE(SUM(${CHARGED}), 0) AS usd
     FROM w
     CROSS JOIN LATERAL (VALUES (1, 'today', w.day_start),
                                (2, 'this week', w.week_start),
                                (3, 'last 30 days', NOW() - INTERVAL '30 days')) AS p(n, label, since)
     LEFT JOIN ai_calls a ON a.at >= p.since
     GROUP BY p.n, p.label ORDER BY p.n`,
  );
  const accounts = await pool.query<{ user_id: number; usd_day: string; usd_week: string }>(
    `WITH w AS (${WINDOWS})
     SELECT a.user_id,
            COALESCE(SUM(${CHARGED}) FILTER (WHERE a.at >= w.day_start), 0) AS usd_day,
            SUM(${CHARGED}) AS usd_week
     FROM w JOIN ai_calls a ON a.at >= w.week_start
     WHERE a.user_id IS NOT NULL
     GROUP BY a.user_id ORDER BY usd_week DESC, a.user_id LIMIT $1`,
    [top],
  );
  const stuck = await pool.query<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM ai_calls a WHERE a.error = 'pending' AND a.at < NOW() - INTERVAL '5 minutes'",
  );
  return {
    periods: periods.rows.map((r) => ({ label: r.label, calls: r.calls, usd: Number(r.usd) })),
    topAccounts: accounts.rows.map((r) => ({ userId: r.user_id, usdDay: Number(r.usd_day), usdWeek: Number(r.usd_week) })),
    stuckPending: stuck.rows[0]!.n,
  };
}
