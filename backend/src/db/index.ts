// The shared Postgres pool. Every query in the app goes through this.

import { Pool } from "pg";
import config from "../config/index.js";

const pool = new Pool({
  connectionString: config.db.url,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;