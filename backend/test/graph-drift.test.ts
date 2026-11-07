// findDrift is a pure function, so this needs no database.

import { describe, it } from "vitest";

// ---------------------------------------------------------------- Task B (7 Nov)
// Remove `.skip`, import findDrift from "../src/utils/graph-drift.js", and write each body.
// Build two small graphs by hand. Don't use the real data: a test you can read in one
// glance is the point.
describe("findDrift", () => {
  it.skip("finds nothing when both sides match, whatever their order", () => {
    // TODO(Task B)
  });

  it.skip("finds a topic missing from either side, and says which side", () => {
    // TODO(Task B)
  });

  it.skip("finds a link missing from either side", () => {
    // TODO(Task B): also check that a needs link and a helps link between the SAME two
    // topics count as different links.
  });

  it.skip("finds a goal missing from either side", () => {
    // TODO(Task B)
  });
});
