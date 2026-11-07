// The command behind `npm run seed:graph`. All the work is in graph-seed.ts, so tests can
// call the same code without running a script.

import { seedGraph } from "./graph-seed.js";
import { closeNeo4j } from "./neo4j.js";

try {
  const counts = await seedGraph();
  console.log("🌱 graph seeded:", counts);
} catch (err) {
  console.error("❌ seeding the graph failed:", err);
  process.exitCode = 1;
} finally {
  await closeNeo4j();
}
