import { afterAll, describe, it, expect } from "vitest";
import pool from "../../src/db/index.js";
import { instructions } from "@shared/data/instructions";
import { seedInstructions } from "../../src/db/instructions-seed.js";
import { listInstructions } from "../../src/repos/instructions.repo.js";

afterAll(() => pool.end());

describe("the prompt instructions", () => {
  it("reads back exactly what the file says, in file order", async () => {
    const client = await pool.connect();

    try {
      await seedInstructions(client);
    } finally {
      client.release();
    }

    const result = await listInstructions();

    expect(result).toEqual(instructions);

    const baseLine = result.find((item) => item.scope === "base");

    expect(baseLine).toBeDefined();
    expect(baseLine).not.toHaveProperty("status");
    expect(baseLine).not.toHaveProperty("topicId");
  });

  it("is idempotent: seeding twice keeps one row per line", async () => {
    const client = await pool.connect();

    try {
      await seedInstructions(client);
      await seedInstructions(client);
    } finally {
      client.release();
    }

    const result = await pool.query(
      "SELECT COUNT(*) FROM prompt_instructions"
    );

    expect(Number(result.rows[0].count)).toBe(instructions.length);
  });

  it("updates a changed line and removes one no longer in the file", async () => {
    const client = await pool.connect();

    try {
      const firstInstruction = instructions[0];

      await client.query(
        "UPDATE prompt_instructions SET text = $1 WHERE id = $2",
        ["incorrect text", firstInstruction.id]
      );

      await client.query(
        `INSERT INTO prompt_instructions
          (id, scope, status, topic_id, text, position)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ["fake-instruction", "base", null, null, "fake text", 999]
      );

      await seedInstructions(client);
    } finally {
      client.release();
    }

    const result = await listInstructions();

    expect(result.find((item) => item.id === instructions[0].id)?.text)
      .toBe(instructions[0].text);

    expect(result.find((item) => item.id === "fake-instruction"))
      .toBeUndefined();
  });
});