// assertCounts is a pure function, so this needs no database.

import { describe, expect, it } from "vitest";
import { assertCounts, expectedCounts } from "../src/db/graph-seed.js";

describe("assertCounts (Task A, 7 Nov)", () => {
  it("accepts counts that match", () => {
    expect(() => assertCounts(expectedCounts, expectedCounts)).not.toThrow();
  });

  it("names every field that differs, with both numbers", () => {
    const actual = { ...expectedCounts, needs: expectedCounts.needs - 1, goals: expectedCounts.goals + 1 };
    let error: unknown;
    try {
      assertCounts(actual, expectedCounts);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(`needs: expected ${expectedCounts.needs}, found ${actual.needs}`);
    expect((error as Error).message).toContain(`goals: expected ${expectedCounts.goals}, found ${actual.goals}`);
  });
});
