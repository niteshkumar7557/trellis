// The admin's tool for a forgotten password (docs/design.md Flow 6, backend-design.md §4).
//
//   development:  npm run reset-link -- student@example.com
//   production:   docker compose exec api node dist/db/reset-link.js student@example.com
//
// Prints a link that sets a new password, valid for one hour and for one use. The admin
// sends it in reply to an email FROM that address, which is what shows the request came
// from the account's owner. The admin never sees or sets a password.
//
// The link holds the token; the database keeps only its hash. So the link printed here is
// the only copy: lose it and make another (which also cancels this one).

import config from "../config/index.js";
import { createPasswordReset } from "../repos/auth.repo.js";
import { hashToken, newRandomToken } from "../utils/tokens.js";
import pool from "./index.js";

/** The same clean-up the API's schemas do: emails are stored trimmed and in lower case. */
export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function makeResetLink(rawEmail: string): Promise<string | null> {
  const token = newRandomToken();
  const userId = await createPasswordReset(normaliseEmail(rawEmail), hashToken(token));
  if (userId === null) return null;
  return `${config.public_url}/reset?token=${token}`;
}

// Run only when started as a script, not when a test imports makeResetLink.
// process.argv[1] is the file Node was asked to run.
const isScript = process.argv[1]?.replace(/\.ts$/, ".js").endsWith("reset-link.js");

if (isScript) {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run reset-link -- student@example.com");
    process.exit(1);
  }
  try {
    const link = await makeResetLink(email);
    if (link === null) {
      // Safe to say here: only the admin, on the server, sees it.
      console.error(`❌ No account uses ${normaliseEmail(email)}.`);
      process.exitCode = 1;
    } else {
      console.log(`🔑 Reset link for ${normaliseEmail(email)} (one use, valid for one hour):\n\n${link}\n`);
    }
  } finally {
    await pool.end();
  }
}
