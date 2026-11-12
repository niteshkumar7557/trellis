// Copies shared/data/instructions.ts into the prompt_instructions table (migration 0013).
// One step of src/db/seed.ts, which runs it inside its transaction.

import type { PoolClient } from "pg";
import { instructions } from "@shared/data/instructions";

/**
 * Makes the table match the file:
 *   - every instruction is inserted, with `position` = its index in the file;
 *   - a line that's already there is updated (an upsert: one atomic statement, unlike a
 *     SELECT then an INSERT, which two processes could race on). EXCLUDED is the row we
 *     just tried to insert;
 *   - a line no longer in the file is deleted. This is reviewed content, not student data,
 *     so here deleting is right.
 */
export async function seedInstructions(client: PoolClient) {
  for (const [position, line] of instructions.entries()) {
    await client.query(
      `INSERT INTO prompt_instructions (id, scope, status, topic_id, text, position)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         scope = EXCLUDED.scope,
         status = EXCLUDED.status,
         topic_id = EXCLUDED.topic_id,
         text = EXCLUDED.text,
         position = EXCLUDED.position`,
      [line.id, line.scope, line.status ?? null, line.topicId ?? null, line.text, position],
    );
  }

  // pg sends a JavaScript array as one SQL array parameter.
  await client.query("DELETE FROM prompt_instructions WHERE NOT (id = ANY($1))", [
    instructions.map((line) => line.id),
  ]);
}
