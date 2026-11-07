// Boot: prove both databases are reachable and the graph is seeded, THEN serve. If anything
// is wrong, stop here with the reason, rather than answer requests badly later.

import app from "./app.js";
import config from "./config/index.js";
import pool from "./db/index.js";
import { verifyNeo4j } from "./db/neo4j.js";
import { checkGraphAtBoot } from "./repos/graph.repo.js";

async function start() {
  try {
    await pool.query("SELECT 1");
    console.log("Database is connected!");

    await verifyNeo4j();
    await checkGraphAtBoot();
    console.log("Neo4j is connected and seeded!");

    app.listen(config.server_port, () => {
      console.log(`Server is up and running on PORT ${config.server_port}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
