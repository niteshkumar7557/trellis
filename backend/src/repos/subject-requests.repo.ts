// "Learning something else?" requests (subject_requests, migration 0011).

import pool from "../db/index.js";

export async function addSubjectRequest(userId: number, text: string): Promise<void> {
  await pool.query("INSERT INTO subject_requests (user_id, text) VALUES ($1, $2)", [userId, text]);
}
