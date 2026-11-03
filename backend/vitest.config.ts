// The test runner (`npm test`). Vitest runs TypeScript directly (no build step) and
// gives Jest-style describe / it / expect.

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Vitest doesn't read tsconfig "paths", so the @shared alias is repeated here.
    alias: { "@shared": fileURLToPath(new URL("../shared", import.meta.url)) },
  },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
