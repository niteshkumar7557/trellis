// Big topics opened early with "Look inside now" (opened_topics, migration 0010).

import type { PoolClient } from "pg";
import pool from "../db/index.js";

/** Opening one already open changes nothing, and is not an error. */
export async function openTopic(userId: number, topicId: string): Promise<void> {
  await pool.query(
    `INSERT INTO opened_topics (user_id, topic_id) VALUES ($1, $2)
     ON CONFLICT (user_id, topic_id) DO NOTHING`,
    [userId, topicId],
  );
}

/** The big topics opened by hand, in the order they were opened. */
export async function listOpened(userId: number, db: Pick<PoolClient, "query"> = pool): Promise<string[]> {
  const { rows } = await db.query<{ topic_id: string }>(
    "SELECT topic_id FROM opened_topics WHERE user_id = $1 ORDER BY at, topic_id",
    [userId],
  );
  return rows.map((r) => r.topic_id);
}
