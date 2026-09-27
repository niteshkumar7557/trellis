// Boot: prove the database is reachable, and log it, 
// then serve and start the pollers (in future).

import app from "./app.js";
import config from "./config/index.js";
import pool from "./db/index.js";

async function start() {
  try {
    await pool.query("SELECT 1");
    console.log("Database is connected!")
    const server = app.listen(config.server_port, () => {
        console.log(`Server is up and running on PORT ${config.server_port}`)
    });

  } catch (err) {
    process.exit(1);
  }
}

start();