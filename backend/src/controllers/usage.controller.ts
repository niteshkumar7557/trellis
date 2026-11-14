// How much of its AI allowance an account has used (backend-design.md §5 "Cost limits").
//
//   GET /api/usage → AiUsage: { on, day: {usedPct, resetsAt}, week: {usedPct, resetsAt}, basic }
//
// The same object rides along on GET /api/state (so the app loads it with everything
// else) and on every helper reply (so the meter moves without a second request). This
// route is for refreshing it on its own: the Settings page, and a tab left open past a
// reset time.
//
// Percentages only. The dollars behind them never leave the server: what a message costs
// is the operator's business (`npm run ai:spend`), not the student's.

import type { AiUsage } from "@shared/types";
import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { usageOf } from "../ai/limits.js";
import pool from "../db/index.js";
import { currentUserId } from "../middlewares/auth.middleware.js";
import { spendFor } from "../repos/ai-calls.repo.js";

/** One account's usage, read fresh from ai_calls. `db` lets a caller read inside its own transaction. */
export async function usageFor(userId: number, db: Pick<PoolClient, "query"> = pool): Promise<AiUsage> {
  const { spend, windows } = await spendFor(userId, db);
  return usageOf(spend, windows);
}

export async function showUsage(req: Request, res: Response) {
  // The student's own numbers, and they change with every message: never cached.
  res.set("Cache-Control", "no-store");
  res.json(await usageFor(currentUserId(req)));
}
