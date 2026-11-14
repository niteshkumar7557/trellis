// The helper's proposals (migration 0014): what Save, Cancel and Undo act on.
//
// Each of the three moves a proposal from one state to another, and each must work ONCE:
// a double click or a retried request must not create the check-ins twice. The guard is
// in the SQL: every change says `WHERE state = '<the state it expects>'`, and Postgres
// row locks make the second of two simultaneous requests find nothing to change.

import type { Proposal, SubjectId } from "@shared/types";
import type { PoolClient } from "pg";
import pool from "../db/index.js";

type Db = Pick<PoolClient, "query">;

export interface OpenProposal {
  subjectId: SubjectId;
  messageId: string;
  payload: Proposal;
}

/**
 * Locks this student's OPEN proposal for the rest of the transaction and returns it, or
 * null if it isn't open (already decided) or isn't theirs.
 *
 * FOR UPDATE is what makes Save safe to click twice: the second request waits at this
 * line until the first commits, then sees state = 'saved' and gets no row.
 */
export async function lockOpenProposal(db: Db, userId: number, id: string): Promise<OpenProposal | null> {
  const { rows } = await db.query<{ subject_id: SubjectId; message_id: string; payload: Proposal }>(
    `SELECT subject_id, message_id, payload FROM proposals
     WHERE id = $1 AND user_id = $2 AND state = 'open'
     FOR UPDATE`,
    [id, userId],
  );
  const r = rows[0];
  return r ? { subjectId: r.subject_id, messageId: r.message_id, payload: r.payload } : null;
}

export async function markSaved(db: Db, id: string, payload: Proposal): Promise<void> {
  await db.query("UPDATE proposals SET state = 'saved', payload = $2, decided_at = NOW() WHERE id = $1", [
    id,
    JSON.stringify(payload),
  ]);
}

/**
 * One guarded move, e.g. 'open' → 'cancelled' or 'saved' → 'undone'. Returns the message
 * that shows the card, or null when the proposal was not in the `from` state (or isn't
 * theirs): nothing changed.
 */
export async function moveState(
  db: Db,
  userId: number,
  id: string,
  from: "open" | "saved",
  to: "cancelled" | "undone",
): Promise<string | null> {
  const { rows } = await db.query<{ message_id: string }>(
    `UPDATE proposals SET state = $4, decided_at = NOW()
     WHERE id = $1 AND user_id = $2 AND state = $3
     RETURNING message_id`,
    [id, userId, from, to],
  );
  return rows[0]?.message_id ?? null;
}

/** Tells "already decided" (409) apart from "no such proposal for you" (404). */
export async function proposalExists(userId: number, id: string): Promise<boolean> {
  const { rowCount } = await pool.query("SELECT 1 FROM proposals WHERE id = $1 AND user_id = $2", [id, userId]);
  return rowCount === 1;
}

/** Undo: removes exactly the rows this proposal's save created, and nothing else. */
export async function deleteSavedRows(db: Db, userId: number, proposalId: string): Promise<void> {
  await db.query("DELETE FROM check_ins WHERE user_id = $1 AND proposal_id = $2", [userId, proposalId]);
  await db.query("DELETE FROM experiences WHERE user_id = $1 AND proposal_id = $2", [userId, proposalId]);
}
