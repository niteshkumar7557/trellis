// Status changes on subtopics (check_ins, migration 0015). There is no "create" here on
// purpose: check-ins are created only by saving a helper proposal (M4.3), so every one
// has gone through the confirm card (backend-design.md §4).
//
// Every statement has `user_id = $1`: an id that belongs to someone else finds no row,
// and the route answers 404, never confirming that the id exists.

import type { CheckIn, Outcome } from "@shared/types";
import type { PoolClient } from "pg";
import pool from "../db/index.js";

interface CheckInRow {
  id: string;
  topic_id: string;
  outcome: Outcome;
  text: string;
  at: Date;
  message_id: string | null;
}

export const toCheckIn = (r: CheckInRow): CheckIn => ({
  id: r.id,
  at: r.at.toISOString(),
  text: r.text,
  topicId: r.topic_id,
  outcome: r.outcome,
  // Optional in the shared type: only check-ins from a helper message have one.
  ...(r.message_id ? { messageId: r.message_id } : {}),
});

// messageId is read through the proposal that made the check-in (proposals.message_id),
// rather than stored twice. LEFT JOIN: a check-in whose proposal is gone still shows.
const SELECT = `
  SELECT c.id, c.topic_id, c.outcome, c.text, c.at, p.message_id
  FROM check_ins c LEFT JOIN proposals p ON p.id = c.proposal_id`;

/** Newest first. `db` lets GET /api/state read it inside its own transaction. */
export async function listCheckIns(userId: number, db: Pick<PoolClient, "query"> = pool): Promise<CheckIn[]> {
  const { rows } = await db.query<CheckInRow>(`${SELECT} WHERE c.user_id = $1 ORDER BY c.at DESC, c.id`, [userId]);
  return rows.map(toCheckIn);
}

export interface CheckInChanges {
  topicId?: string;
  outcome?: Outcome;
  text?: string;
}

/**
 * Changes only the fields given. COALESCE($n, column) keeps the column when the value is
 * NULL, so one statement serves every combination of fields. `at` stays: editing a
 * check-in fixes what it says, not when it happened (statuses depend on the order).
 */
export async function updateCheckIn(userId: number, id: string, changes: CheckInChanges): Promise<CheckIn | null> {
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE check_ins
     SET topic_id = COALESCE($3, topic_id),
         outcome  = COALESCE($4, outcome),
         text     = COALESCE($5, text)
     WHERE user_id = $1 AND id = $2
     RETURNING id`,
    [userId, id, changes.topicId ?? null, changes.outcome ?? null, changes.text ?? null],
  );
  if (rows.length === 0) return null;
  const { rows: full } = await pool.query<CheckInRow>(`${SELECT} WHERE c.user_id = $1 AND c.id = $2`, [userId, id]);
  return toCheckIn(full[0]!);
}

/** False when there was no such row for this student. */
export async function deleteCheckIn(userId: number, id: string): Promise<boolean> {
  const { rowCount } = await pool.query("DELETE FROM check_ins WHERE user_id = $1 AND id = $2", [userId, id]);
  return rowCount === 1;
}
