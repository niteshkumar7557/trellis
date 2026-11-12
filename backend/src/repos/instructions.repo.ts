// Part 3 of every prompt, read from Postgres (the table in migration 0013).

import type { Instruction } from "@shared/types";
import pool from "../db/index.js";

/**
 * Every instruction, in file order.
 *
 * TODO(Task C): query prompt_instructions and turn each row into the Instruction shape in
 * shared/types.ts. SQL NULL isn't "missing": a base line's row has status = null and
 * topic_id = null, but its Instruction must not have those keys at all.
 */
export async function listInstructions(): Promise<Instruction[]> {
    const result = await pool.query(`
        SELECT id, scope, status, topic_id, text
        FROM prompt_instructions
        ORDER BY position`);
    return result.rows.map((row): Instruction => ({
        id: row.id,
        scope: row.scope,
        text: row.text,
        ...(row.status !== null ? { status: row.status } : {}),
        ...(row.topic_id !== null ? { topicId: row.topic_id } : {}),
    }));
}
