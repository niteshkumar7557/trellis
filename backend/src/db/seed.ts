// Seeds what EVERY fresh database needs (`npm run db:seed:dev`, run by `npm run db-init`
// after the migrations). Not fake users: real content the app can't work without.
//
// Nothing yet. M1.4 adds the prompt instructions as the first step.
//
// Rules for a step:
//   - Safe to run twice (INSERT ... ON CONFLICT ... DO UPDATE), because db-init is re-run
//     on databases that already have the data. A seed never deletes student data.
//   - All steps run in ONE transaction: if any step fails, none of them is kept.

import type { PoolClient } from "pg";
import pool from "./index.js";

interface SeedStep {
  name: string;
  run: (client: PoolClient) => Promise<void>;
}

const steps: SeedStep[] = [];

async function seed() {
  const client = await pool.connect(); // one connection: a transaction lives on one connection
  try {
    await client.query("BEGIN");
    for (const step of steps) {
      await step.run(client);
      console.log(`✅ ${step.name}`);
    }
    await client.query("COMMIT");
    console.log(steps.length ? `🌱 seeded ${steps.length} step(s)` : "🌱 nothing to seed yet");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ seeding failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
