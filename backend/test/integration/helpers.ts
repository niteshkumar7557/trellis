import driver from "../../src/db/neo4j.js";

/** Runs one Cypher query and returns each row as a plain object. */
export async function cypher(query: string, params: Record<string, unknown> = {}) {
  const { records } = await driver.executeQuery(query, params);
  return records.map((r) => r.toObject());
}
