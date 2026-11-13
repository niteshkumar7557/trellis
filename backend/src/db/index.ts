// The shared Postgres pool. Every query in the app goes through this.

import { Pool, type PoolClient } from "pg";
import config from "../config/index.js";

const pool = new Pool({
  connectionString: config.db.url,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;

/**
 * Runs several reads that must agree with each other, e.g. GET /api/state.
 *
 * Without this, each query sees the database as it is when THAT query runs. If the
 * student saves a proposal while /api/state is half-way through, the response could hold
 * the new check-ins but the old chat messages. REPEATABLE READ makes every query in the
 * transaction see one snapshot, taken at its first query. READ ONLY documents (and
 * enforces) that nothing here writes.
 */
export async function readSnapshot<T>(work: (db: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
