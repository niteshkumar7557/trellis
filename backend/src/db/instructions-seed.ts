// Copies shared/data/instructions.ts into the prompt_instructions table (migration 0013).
// One step of src/db/seed.ts, which runs it inside its transaction.

import type { PoolClient } from "pg";

/**
 * TODO(Task C): make the table match the file:
 *   - insert every instruction, with `position` = its index in the file;
 *   - a line that's already there gets updated (INSERT ... ON CONFLICT (id) DO UPDATE);
 *   - a line no longer in the file gets deleted. This is reviewed content, not student data,
 *     so here deleting is right.
 * Parameterised SQL only.
 */
export async function seedInstructions(_client: PoolClient) {}
