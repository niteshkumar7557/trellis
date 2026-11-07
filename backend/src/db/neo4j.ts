// The shared Neo4j driver: the graph's version of src/db/index.ts (the Postgres pool).
//
// A driver is a pool of connections. It's cheap to import, because it connects only when
// first used, and expensive to create many of, so the whole app shares this one.

import neo4j from "neo4j-driver";
import config from "../config/index.js";

const driver = neo4j.driver(
  config.neo4j.url,
  neo4j.auth.basic(config.neo4j.user, config.neo4j.password ?? ""),
  // Neo4j integers are 64-bit, and JavaScript numbers can't hold all of those, so by default
  // the driver returns special Integer objects: { low: 45, high: 0 } instead of 45. Our
  // numbers (minutes, positions) are small, so plain numbers are safe and match the shapes
  // in shared/types.ts.
  { disableLosslessIntegers: true },
);

/** Throws if Neo4j can't be reached or the password is wrong. Called once, at boot. */
export async function verifyNeo4j() {
  await driver.verifyConnectivity();
}

/** A script must close the driver when it's done, or Node stays alive waiting on it. */
export async function closeNeo4j() {
  await driver.close();
}

export default driver;
