// The content checks in shared/data/index.ts must all pass.
//
// That file checks the topic data against itself (no duplicate ids, no prerequisite loops,
// every big topic has a core subtopic, ...) about 1,500 times, with console.assert, ONCE,
// at the moment it is first imported. A failing console.assert only PRINTS; it never
// throws. So a plain test would pass even with broken data. Instead we WATCH console.assert
// while the file loads, and fail if any call was false.
//
// Two details make that work:
//   - A normal `import` at the top of this file would run the checks before any test
//     starts, so the data is loaded with a dynamic `await import(...)` INSIDE the test,
//     after the watcher (the spy) is set up.
//   - Vitest gives each test FILE its own fresh set of modules, so the checks really run
//     here, even though golden.test.ts imports the same data. That's why this is its own file.

import { expect, it, vi } from "vitest";

// ---------------------------------------------------------------- Task B (3 Nov)
it.skip("the topic data passes every check in shared/data/index.ts", async () => {
  const assert = vi.spyOn(console, "assert");
  // TODO(Task B):
  //   1. load the data:      await import("@shared/data");
  //   2. keep the failures:  const failed = assert.mock.calls.filter(([ok]) => !ok);
  //   3. expect no failures: expect(failed).toEqual([]);
  //      (on failure, Vitest prints each failing call, message included)
  //   4. and expect(assert).toHaveBeenCalled(), so the test can't pass by checking nothing.
});
