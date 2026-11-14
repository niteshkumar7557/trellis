// Status changes on subtopics (check_ins, migration 0015). Check-ins are created only by
// saving a helper proposal (insertCheckIns, called from the save in M4.3), so every one
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

/**
 * Saving a proposal: one check-in per update, each pointing back at the proposal.
 * clock_timestamp() rather than the default NOW(): inside the save's transaction NOW() is
 * one fixed time, so the rows would tie and come back in random order.
 */
export async function insertCheckIns(
  db: Pick<PoolClient, "query">,
  userId: number,
  proposalId: string,
  rows: { topicId: string; outcome: Outcome; text: string }[],
): Promise<void> {
  for (const r of rows) {
    await db.query(
      `INSERT INTO check_ins (user_id, topic_id, outcome, text, proposal_id, at)
       VALUES ($1, $2, $3, $4, $5, clock_timestamp())`,
      [userId, r.topicId, r.outcome, r.text, proposalId],
    );
  }
}

/** The check-ins one proposal created (the save's answer). */
export async function listCheckInsOfProposal(
  userId: number,
  proposalId: string,
  db: Pick<PoolClient, "query"> = pool,
): Promise<CheckIn[]> {
  const { rows } = await db.query<CheckInRow>(`${SELECT} WHERE c.user_id = $1 AND c.proposal_id = $2 ORDER BY c.at, c.id`, [
    userId,
    proposalId,
  ]);
  return rows.map(toCheckIn);
}
