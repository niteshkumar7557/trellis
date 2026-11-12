// The test runner (`npm test`). Vitest runs TypeScript directly (no build step) and
// gives Jest-style describe / it / expect. These tests need NO database, so they run
// anywhere in a second. The ones that do need databases are in test/integration/ and run
// with `npm run test:integration` (vitest.integration.config.ts).

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Vitest doesn't read tsconfig "paths", so the @shared alias is repeated here.
    alias: { "@shared": fileURLToPath(new URL("../shared", import.meta.url)) },
  },
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/integration/**"],
    environment: "node",
  },
});
