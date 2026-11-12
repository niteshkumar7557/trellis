// The prompt instructions in a real Postgres. Run with `npm run test:integration`, after
// `npm run db-init`, so that the table from migration 0013 exists.

import { afterAll, describe, expect, it } from "vitest";
import { instructions } from "@shared/data/instructions";
import pool from "../../src/db/index.js";
import { seedInstructions } from "../../src/db/instructions-seed.js";
import { listInstructions } from "../../src/repos/instructions.repo.js";

afterAll(() => pool.end());

async function seed() {
  const client = await pool.connect();
  try {
    await seedInstructions(client);
  } finally {
    client.release();
  }
}

describe("the prompt instructions", () => {
  it("reads back exactly what the file says, in file order", async () => {
    await seed();
    const read = await listInstructions();
    expect(read).toEqual(instructions);
    // toEqual ignores keys set to undefined; JSON wouldn't.
    const base = read.find((i) => i.scope === "base")!;
    expect(Object.keys(base)).not.toContain("status");
    expect(Object.keys(base)).not.toContain("topicId");
  });

  it("is idempotent: seeding twice keeps one row per line", async () => {
    await seed();
    await seed();
    const { rows } = await pool.query("SELECT count(*) FROM prompt_instructions");
    expect(Number(rows[0].count)).toBe(instructions.length);
  });

  it("updates a changed line and removes one no longer in the file", async () => {
    const line = instructions[0];
    await pool.query("UPDATE prompt_instructions SET text = 'changed' WHERE id = $1", [line.id]);
    await pool.query(
      "INSERT INTO prompt_instructions (id, scope, text) VALUES ('made-up', 'base', 'x')",
    );

    await seed();

    const { rows } = await pool.query(
      "SELECT id, text FROM prompt_instructions WHERE id = ANY($1)",
      [[line.id, "made-up"]],
    );
    expect(rows).toEqual([{ id: line.id, text: line.text }]);
  });
});
