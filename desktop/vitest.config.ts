import { defineConfig } from "vitest/config";

// Unit tests cover only the pure files (no `electron` import), so they run in plain Node,
// on any machine, and in CI. The window itself is tested by Playwright (test/e2e/).
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // One fixed time zone with daylight saving, so the reminder's times mean the same on
    // the owner's Mac (India has no DST) and on CI (UTC).
    env: { TZ: "America/New_York" },
  },
});
