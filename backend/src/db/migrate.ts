import fs from "fs";
import path from "path";
import { Pool } from "pg";
import config from "../config/index.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: config.db.url,
});

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   TEXT NOT NULL UNIQUE,
        run_at     TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query(
      "SELECT filename FROM _migrations ORDER BY filename ASC",
    );
    const alreadyRan = new Set(rows.map((r) => r.filename));

    const migrationsDir = path.join(__dirname, "migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let ranCount = 0;

    for (const file of files) {
      if (alreadyRan.has(file)) {
        console.log(`⏭  skipping  ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (filename) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");
        console.log(`✅ ran       ${file}`);
        ranCount++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`❌ failed on ${file}`);
        console.error(err);
        process.exit(1);
      }
    }

    if (ranCount === 0) {
      console.log("✅ database already up to date");
    } else {
      console.log(`✅ ${ranCount} migration(s) complete`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}
migrate();