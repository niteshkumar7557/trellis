// Part 3 of every prompt, read from Postgres (the table in migration 0013).

import type { Instruction } from "@shared/types";
import pool from "../db/index.js";

interface InstructionRow {
  id: string;
  scope: Instruction["scope"];
  status: Instruction["status"] | null;
  topic_id: string | null;
  text: string;
}

/**
 * Every instruction, in file order.
 *
 * SQL NULL isn't "missing": a base line's row has status = null and topic_id = null, but its
 * Instruction must not have those keys at all, or the JSON would say "status": null.
 */
export async function listInstructions(): Promise<Instruction[]> {
  const { rows } = await pool.query<InstructionRow>(
    "SELECT id, scope, status, topic_id, text FROM prompt_instructions ORDER BY position",
  );
  return rows.map((r) => ({
    id: r.id,
    scope: r.scope,
    ...(r.status !== null && { status: r.status }),
    ...(r.topic_id !== null && { topicId: r.topic_id }),
    text: r.text,
  }));
}
