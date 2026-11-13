// Prompts the student took (prompt_takes, migration 0017).

import type { PromptTake } from "@shared/types";
import type { PoolClient } from "pg";
import pool from "../db/index.js";

interface PromptTakeRow {
  id: string; // BIGSERIAL: pg returns 64-bit integers as strings, which suits the shared type
  topic_id: string;
  via: PromptTake["via"];
  at: Date;
}

const toPromptTake = (r: PromptTakeRow): PromptTake => ({
  id: String(r.id),
  topicId: r.topic_id,
  via: r.via,
  at: r.at.toISOString(),
});

export async function addPromptTake(userId: number, topicId: string, via: PromptTake["via"]): Promise<PromptTake> {
  const { rows } = await pool.query<PromptTakeRow>(
    "INSERT INTO prompt_takes (user_id, topic_id, via) VALUES ($1, $2, $3) RETURNING id, topic_id, via, at",
    [userId, topicId, via],
  );
  return toPromptTake(rows[0]!);
}

/**
 * Newest first. `limit` is for GET /api/state, which needs only the recent ones: the
 * "how did it go?" rule looks back 14 days at most. The export passes no limit.
 */
export async function listPromptTakes(
  userId: number,
  limit: number | null = null,
  db: Pick<PoolClient, "query"> = pool,
): Promise<PromptTake[]> {
  const { rows } = await db.query<PromptTakeRow>(
    // LIMIT NULL means "no limit" in Postgres, so one statement serves both callers.
    "SELECT id, topic_id, via, at FROM prompt_takes WHERE user_id = $1 ORDER BY at DESC, id DESC LIMIT $2",
    [userId, limit],
  );
  return rows.map(toPromptTake);
}
