import { defineConfig } from "@playwright/test";

// End-to-end tests: launch the real app (dist/, built by `npm run test:e2e`) and check it
// from the outside. They run on the owner's Mac, not in CI: Electron needs a display.
// They run against the app from source, not the packaged one, because the packaged app's
// Fuses switch off the debugging hooks Playwright drives it with (docs/desktop.md §4).
export default defineConfig({
  testDir: "test/e2e",
  testMatch: "*.e2e.ts",
  workers: 1, // one app at a time: they share the single-instance lock
  timeout: 30_000,
});
