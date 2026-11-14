// The money rules for the AI (docs/backend-design.md §5 "Cost limits"), as plain functions
// with no database and no network, so each rule can be read and tested on its own.
//
// Three limits, all in dollars, all counted from the ai_calls table:
//   - each account: per day and per week (the same across all its subjects);
//   - the whole site: per day. This is the one that truly caps the bill, because anyone
//     can sign up more than once. The account limits stop one account using everyone's share.
//
// At a limit nothing is refused: the rule-based reader reads the message instead ("basic
// mode"), which costs nothing. Students never see dollars, only a percentage (usageOf).
//
// Who uses this: src/repos/ai-calls.repo.ts decides a reservation with blockedBy();
// src/ai/bedrock.ts sizes a reservation with worstCaseUsd() and settles it with
// chargeFor(); the usage, state and helper controllers answer with usageOf().

import type { AiUsage } from "@shared/types";
import config from "../config/index.js";

/** The three limits, in dollars. */
export interface Limits {
  siteDailyUsd: number;
  userDailyUsd: number;
  userWeeklyUsd: number;
}

/** What has been spent so far in each window, in dollars, pending calls included. */
export interface Spend {
  siteDay: number;
  userDay: number;
  userWeek: number;
}

/** When the current day and week end (UTC midnight; Monday for the week). */
export interface Windows {
  dayEnds: Date;
  weekEnds: Date;
}

/** Which limit stops a model call. */
export type Blocked = "day" | "week" | "site";

/** The limits from the environment (backend/example.env). */
export function limits(): Limits {
  return {
    siteDailyUsd: config.ai.daily_budget_usd,
    userDailyUsd: config.ai.user_daily_usd,
    userWeeklyUsd: config.ai.user_weekly_usd,
  };
}

/**
 * The limit that stops a call now, or null when the call may go ahead.
 *
 * `>=`, not "would this call fit": a call is allowed while ANYTHING is left, so the meter
 * reaches exactly 100% when the AI stops, instead of stopping at a confusing 93%. A limit
 * can therefore be passed by at most one call (under half a cent). It cannot be passed by
 * more, because a call that is still running already counts at its worst case.
 *
 * `forUser` false is the server's own warm-up call: it has no account, so only the site's
 * budget applies.
 *
 * The order matters only for the wording the student sees: the week is named first
 * because it is the longest wait, and the site last because it is nobody's own limit.
 */
export function blockedBy(spend: Spend, l: Limits, forUser = true): Blocked | null {
  if (forUser && spend.userWeek >= l.userWeeklyUsd) return "week";
  if (forUser && spend.userDay >= l.userDailyUsd) return "day";
  if (spend.siteDay >= l.siteDailyUsd) return "site";
  return null;
}

/**
 * Spent out of a limit, as a whole percentage from 0 to 100.
 *
 * Two corrections to plain rounding, so the number never contradicts what happens:
 *   - anything spent shows at least 1% (one message is under 1% of a week);
 *   - 100% appears only when the limit is really reached (99.6% shows as 99%).
 */
export function percentUsed(spent: number, limit: number): number {
  if (spent >= limit) return 100; // also a limit of 0: nothing is allowed, so all is used
  if (spent <= 0) return 0;
  return Math.min(99, Math.max(1, Math.round((spent / limit) * 100)));
}

/** What the screens are told: percentages, reset times and whether the AI is reading. */
export function usageOf(spend: Spend, windows: Windows, l: Limits = limits()): AiUsage {
  const on = config.ai.provider === "bedrock";
  return {
    on,
    day: { usedPct: percentUsed(spend.userDay, l.userDailyUsd), resetsAt: windows.dayEnds.toISOString() },
    week: { usedPct: percentUsed(spend.userWeek, l.userWeeklyUsd), resetsAt: windows.weekEnds.toISOString() },
    // With the AI off the rules read everything anyway; that isn't a limit to report.
    basic: on ? blockedBy(spend, l) : null,
  };
}

// ---------------------------------------------------------------- pricing one call

/** What a call cost, in dollars, from the token counts and the configured prices. */
export function costUsd(inputTokens: number, outputTokens: number): number {
  const dollars = (inputTokens * config.ai.price_in_per_m + outputTokens * config.ai.price_out_per_m) / 1_000_000;
  // NUMERIC(10,6) in the table: round here so the row and this number agree.
  return Math.round(dollars * 1_000_000) / 1_000_000;
}

/**
 * The most one call is expected to cost: what is reserved before it is sent.
 *
 * Output: the full `maxTokens`, which Bedrock enforces. Input: one token per 3 bytes of
 * text. The real figure, measured on 31 calls, is about one token per 3.7 characters of
 * our English instructions, so this runs some 25% high. It is an estimate, not a
 * guarantee: text in another script can pack more tokens per byte. That is acceptable
 * because the estimate is replaced by the real cost as soon as the call returns; it only
 * stays when the call timed out (chargeFor).
 */
export function worstCaseUsd(text: string, maxTokens: number): number {
  return costUsd(Math.ceil(Buffer.byteLength(text, "utf8") / 3), maxTokens);
}

// Failures where Bedrock refused the request before any model ran, so nothing was billed.
// The codes come from errorCode() in bedrock.ts.
const NOT_BILLED = new Set(["throttled", "denied", "no_model", "invalid_request", "no_credentials", "unavailable"]);

/**
 * What a finished call counts as, in dollars.
 *
 *   - Bedrock reported tokens: their price, whether or not the reply was usable.
 *   - Bedrock refused the request outright: nothing.
 *   - anything else (a timeout, a dropped connection): the whole reservation. We can't
 *     know what was billed, so we assume the worst. Counting a little too much costs a
 *     student a few percent of a day; counting too little costs real money.
 */
export function chargeFor(inputTokens: number | null, outputTokens: number | null, error: string | null, reservedUsd: number): number {
  if (inputTokens !== null && outputTokens !== null) return costUsd(inputTokens, outputTokens);
  if (error !== null && NOT_BILLED.has(error)) return 0;
  return reservedUsd;
}
