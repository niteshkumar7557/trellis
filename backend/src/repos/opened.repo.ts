// Big topics opened early with "Look inside now" (opened_topics, migration 0010).

import pool from "../db/index.js";

/** Opening one already open changes nothing, and is not an error. */
export async function openTopic(userId: number, topicId: string): Promise<void> {
  await pool.query(
    `INSERT INTO opened_topics (user_id, topic_id) VALUES ($1, $2)
     ON CONFLICT (user_id, topic_id) DO NOTHING`,
    [userId, topicId],
  );
}
