// assertCounts is a pure function, so this needs no database.

import { describe, expect, it } from "vitest";
import { assertCounts, expectedCounts } from "../src/db/graph-seed.js";

describe("assertCounts (Task A, 7 Nov)", () => {
  it("accepts counts that match", () => {
    expect(() => assertCounts(expectedCounts, expectedCounts)).not.toThrow();
  });

  it.skip("names every field that differs, with both numbers", () => {
    // TODO(Task A): pass a copy of expectedCounts with `needs` one lower and `goals` one
    // higher. Expect a throw whose message has "needs: expected", the two numbers, and "goals".
  });
});
