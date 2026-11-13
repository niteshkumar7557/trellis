// The production build (`npm run build`). tsup uses esbuild to turn our TypeScript into
// JavaScript in dist/. It BUNDLES our own code and ../shared into each output file, so the
// built server doesn't need shared/ at runtime. npm packages (express, pg, ...) are NOT
// bundled: they're imported from node_modules at runtime, as normal.

import { defineConfig } from "tsup";

export default defineConfig({
  // One output file per program we run with `node`.
  entry: {
    index: "src/index.ts",
    // Kept under dist/db/ on purpose: migrate.js looks for its SQL files in the
    // "migrations" folder next to itself (dist/db/migrations; the Dockerfile copies them).
    "db/migrate": "src/db/migrate.ts",
    "db/seed": "src/db/seed.ts",
    "db/seed-graph": "src/db/seed-graph.ts",
    // The admin's forgotten-password tool: `node dist/db/reset-link.js <email>`.
    "db/reset-link": "src/db/reset-link.ts",
  },
  format: ["esm"], // package.json says "type": "module"
  platform: "node",
  target: "node24", // the Node version in the Dockerfile
  outDir: "dist",
  clean: true, // empty dist/ first, so old files never linger
  sourcemap: true, // stack traces point at the .ts lines, not the bundled .js
});
