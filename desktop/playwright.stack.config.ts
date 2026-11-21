import { defineConfig } from "@playwright/test";

// `npm run test:e2e:stack`: the desktop app against the LOCAL Trellis stack (dev Postgres,
// the backend on :8000, the frontend on :3000; see CLAUDE.md "Run"). Its own command,
// rather than a test that skips itself when the servers are down: a skipped test looks
// like a pass.
export default defineConfig({
  testDir: "test/e2e-stack",
  testMatch: "*.e2e.ts",
  workers: 1,
  timeout: 60_000,
});
