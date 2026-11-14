// Boot. Postgres must be reachable: every student's record lives there, so without it
// the API can do nothing useful, and it is better to stop with the reason than to answer
// every request with a 500.
//
// Neo4j is NOT required (backend-design.md §2). Its state is checked and logged, and the
// server starts either way; the graph routes answer 503 until it is up and seeded.

import { startWarmUps } from "./ai/reader.js";
import app from "./app.js";
import config from "./config/index.js";
import pool from "./db/index.js";
import { graphState } from "./middlewares/graph.middleware.js";

async function start() {
  try {
    await pool.query("SELECT 1");
    console.log("Postgres is connected.");
  } catch (err) {
    console.error("Postgres is unreachable; not starting.", err);
    process.exit(1);
  }

  // Logs "Neo4j: ok", "Neo4j: down …" or "Neo4j: drift …" and carries on.
  await graphState();

  // The helper's AI. Off: the rules read every message. On: keep Bedrock's compiled
  // schema warm, so students' calls don't time out on it (src/ai/reader.ts).
  console.log(`Helper AI: ${config.ai.provider === "bedrock" ? `${config.ai.reader_model} on Bedrock (${config.ai.region})` : "off, the rules read every message"}`);
  if (config.ai.provider === "bedrock") startWarmUps();

  app.listen(config.server_port, () => {
    console.log(`Server is up and running on PORT ${config.server_port}`);
  });
}

start();
