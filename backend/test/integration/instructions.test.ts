// The prompt instructions in a real Postgres. Run with `npm run test:integration`, after
// `npm run db-init`, so that the table from migration 0013 exists.

import { afterAll, describe, it } from "vitest";
import pool from "../../src/db/index.js";

afterAll(() => pool.end());

// ---------------------------------------------------------------- Task C (7 Nov)
// Remove `.skip`, import seedInstructions from "../../src/db/instructions-seed.js" and
// listInstructions from "../../src/repos/instructions.repo.js", and write each body.
// seedInstructions needs a client: const client = await pool.connect(); ... client.release();
describe("the prompt instructions", () => {
  it.skip("reads back exactly what the file says, in file order", async () => {
    // TODO(Task C): seed, then listInstructions() must toEqual `instructions` from
    // @shared/data/instructions. toEqual ignores keys set to undefined; also check that
    // "status" is not in the base line's keys, as JSON would show it.
  });

  it.skip("is idempotent: seeding twice keeps one row per line", async () => {
    // TODO(Task C): seed twice; SELECT count(*) must equal the file's length. Note that pg
    // returns count(*) as a STRING.
  });

  it.skip("updates a changed line and removes one no longer in the file", async () => {
    // TODO(Task C): UPDATE one row's text, and INSERT a row with a made-up id. Seed. The
    // text must be back, and the made-up row gone.
  });
});
