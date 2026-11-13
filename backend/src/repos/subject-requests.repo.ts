// "Learning something else?" requests (subject_requests, migration 0011).

import type { PoolClient } from "pg";
import pool from "../db/index.js";

export async function addSubjectRequest(userId: number, text: string): Promise<void> {
  await pool.query("INSERT INTO subject_requests (user_id, text) VALUES ($1, $2)", [userId, text]);
}

/** The student's own requests, for the export. */
export async function listSubjectRequests(userId: number, db: Pick<PoolClient, "query"> = pool) {
  const { rows } = await db.query<{ text: string; at: Date }>(
    "SELECT text, at FROM subject_requests WHERE user_id = $1 ORDER BY at, id",
    [userId],
  );
  return rows.map((r) => ({ text: r.text, at: r.at.toISOString() }));
}
