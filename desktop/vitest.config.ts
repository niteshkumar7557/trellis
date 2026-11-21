import { defineConfig } from "vitest/config";

// Unit tests cover only the pure files (no `electron` import), so they run in plain Node,
// on any machine, and in CI. The window itself is tested by Playwright (test/e2e/).
export default defineConfig({
  test: { include: ["test/**/*.test.ts"] },
});
