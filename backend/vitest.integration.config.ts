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
    // The real DB_URL comes from backend/.env. The secret is fixed so that tests which sign
    // their own tokens (test/auth-token.ts) match the server's.
    // AI_PROVIDER=off: tests must never call the real Bedrock, even when backend/.env turns
    // it on (they would cost money and answer differently each run). dotenv never
    // overwrites a variable already set, so this wins over .env.
    env: { JWT_SECRET: "test-secret-that-is-at-least-32-characters-long", AI_PROVIDER: "off" },
    // Runs once, before any test file: seeds the graph, so reads have something to read.
    globalSetup: ["test/integration/global-setup.ts"],
    // One file at a time: they share one database, and some change it on purpose.
    fileParallelism: false,
  },
});
