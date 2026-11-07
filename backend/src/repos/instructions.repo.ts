// Part 3 of every prompt, read from Postgres (the table in migration 0013).

import type { Instruction } from "@shared/types";

/**
 * Every instruction, in file order.
 *
 * TODO(Task C): query prompt_instructions and turn each row into the Instruction shape in
 * shared/types.ts. SQL NULL isn't "missing": a base line's row has status = null and
 * topic_id = null, but its Instruction must not have those keys at all.
 */
export async function listInstructions(): Promise<Instruction[]> {
  return [];
}
