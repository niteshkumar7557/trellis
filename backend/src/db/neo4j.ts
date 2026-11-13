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
  //
  // The two timeouts make a Neo4j outage cost seconds, not half a minute. By default the
  // driver waits 30 s to connect and keeps retrying a failed query for 30 s. Neo4j is
  // optional (backend-design.md §2), so a fast 503 is better than a request that hangs.
  { disableLosslessIntegers: true, connectionTimeout: 3000, maxTransactionRetryTime: 3000 },
);

/** A script must close the driver when it's done, or Node stays alive waiting on it. */
export async function closeNeo4j() {
  await driver.close();
}

export default driver;
