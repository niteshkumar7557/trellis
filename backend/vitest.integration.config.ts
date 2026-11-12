// `npm run test:integration`: the tests in test/integration/, against the REAL databases.
// They need `docker compose -f docker-compose.dev.yml up -d` and `npm run db-init`. They fail
// if the databases are down. Skipping instead would hide it, and look like a pass.

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@shared": fileURLToPath(new URL("../shared", import.meta.url)) },
  },
  test: {
    include: ["test/integration/**/*.test.ts"],
    environment: "node",
    // Runs once, before any test file: seeds the graph, so reads have something to read.
    globalSetup: ["test/integration/global-setup.ts"],
    // One file at a time: they share one database, and some change it on purpose.
    fileParallelism: false,
  },
});
