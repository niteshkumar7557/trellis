// What the student said about how topics went (experiences, migration 0016). Like
// check-ins, they are created only by saving a helper proposal (M4.3).

import type { Experience, ExperienceKind } from "@shared/types";
import type { PoolClient } from "pg";
import pool from "../db/index.js";

interface ExperienceRow {
  id: string;
  topic_id: string;
  kind: ExperienceKind;
  text: string;
  line: string;
  at: Date;
  message_id: string | null;
}

const toExperience = (r: ExperienceRow): Experience => ({
  id: r.id,
  at: r.at.toISOString(),
  topicId: r.topic_id,
  kind: r.kind,
  text: r.text,
  line: r.line,
  ...(r.message_id ? { messageId: r.message_id } : {}),
});

const SELECT = `
  SELECT e.id, e.topic_id, e.kind, e.text, e.line, e.at, p.message_id
  FROM experiences e LEFT JOIN proposals p ON p.id = e.proposal_id`;

/** Newest first. */
export async function listExperiences(userId: number, db: Pick<PoolClient, "query"> = pool): Promise<Experience[]> {
  const { rows } = await db.query<ExperienceRow>(`${SELECT} WHERE e.user_id = $1 ORDER BY e.at DESC, e.id`, [userId]);
  return rows.map(toExperience);
}

/** The new text and its rebuilt line always change together; the kind only if given. */
export async function updateExperience(
  userId: number,
  id: string,
  changes: { text: string; line: string; kind?: ExperienceKind },
): Promise<Experience | null> {
  const { rowCount } = await pool.query(
    `UPDATE experiences SET text = $3, line = $4, kind = COALESCE($5, kind)
     WHERE user_id = $1 AND id = $2`,
    [userId, id, changes.text, changes.line, changes.kind ?? null],
  );
  if (rowCount === 0) return null;
  const { rows } = await pool.query<ExperienceRow>(`${SELECT} WHERE e.user_id = $1 AND e.id = $2`, [userId, id]);
  return toExperience(rows[0]!);
}

export async function deleteExperience(userId: number, id: string): Promise<boolean> {
  const { rowCount } = await pool.query("DELETE FROM experiences WHERE user_id = $1 AND id = $2", [userId, id]);
  return rowCount === 1;
}
