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
    // Set before any test file runs. config/index.ts refuses to start without these, and
    // these tests must not depend on anyone's backend/.env. Nothing here connects to that
    // DB_URL: the unit tests replace every repo with a fake. TEST_JWT_SECRET in
    // test/auth-token.ts must match.
    env: {
      JWT_SECRET: "test-secret-that-is-at-least-32-characters-long",
      DB_URL: "postgresql://nobody@localhost:1/not-used-by-unit-tests",
    },
  },
});
