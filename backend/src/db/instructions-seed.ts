// Copies shared/data/instructions.ts into the prompt_instructions table (migration 0013).
// One step of src/db/seed.ts, which runs it inside its transaction.
import { instructions } from "../../../shared/data/instructions";
import type { PoolClient } from "pg";



/**
 * TODO(Task C): make the table match the file:
 *   - insert every instruction, with `position` = its index in the file;
 *   - a line that's already there gets updated (INSERT ... ON CONFLICT (id) DO UPDATE);
 *   - a line no longer in the file gets deleted. This is reviewed content, not student data,
 *     so here deleting is right.
 * Parameterised SQL only.
 */

export async function seedInstructions(client: PoolClient) {
    const insertSql = `
        INSERT INTO prompt_instructions (id, scope, status, topic_id, text, position)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
            scope = EXCLUDED.scope,
            status = EXCLUDED.status,
            topic_id = EXCLUDED.topic_id,
            text = EXCLUDED.text,
            position = EXCLUDED.position
    `;

    for (let i = 0; i < instructions.length; i++) {
        const instruction = instructions[i];

        await client.query(insertSql, [
            instruction.id,
            instruction.scope,
            instruction.status ?? null,
            instruction.topicId ?? null,
            instruction.text,
            i
        ]);
    }

    const idsInFile = instructions.map(instruction => instruction.id);

    await client.query(
        `DELETE FROM prompt_instructions WHERE NOT (id = ANY($1))`,
        [idsInFile]
    );
}