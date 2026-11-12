import { seedGraph } from "../../src/db/graph-seed.js";
import { closeNeo4j } from "../../src/db/neo4j.js";

export default async function setup() {
  await seedGraph();
  await closeNeo4j();
}
