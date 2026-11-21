// The desktop app's one-time sign-in codes (migration 0020, docs/desktop.md §5).
// Like auth.repo.ts, these functions take HASHES, so every call site shows that the plain
// code is never stored.

import pool from "../db/index.js";

/** How long the browser-to-app hand-off may take. Long enough to click "Open Trellis". */
const HANDOFF_MINUTES = 2;

export async function createHandoff(userId: number, codeHash: string, challenge: string): Promise<void> {
  // Tidy up as we go: codes a day past their expiry are of no use to anyone. Doing it here
  // keeps the table small with no scheduled job (Trellis has none).
  await pool.query("DELETE FROM desktop_handoffs WHERE expires_at < NOW() - interval '1 day'");
  await pool.query(
    `INSERT INTO desktop_handoffs (code_hash, user_id, challenge, expires_at)
     VALUES ($1, $2, $3, NOW() + make_interval(mins => $4))`,
    [codeHash, userId, challenge, HANDOFF_MINUTES],
  );
}

/**
 * The account behind a code that is unused, unexpired and matches the challenge; the code
 * is marked used at the same moment. Null for anything else.
 *
 * One UPDATE ... RETURNING does the check and the marking together, so two exchanges of
 * the same code at the same instant can't both succeed: Postgres locks the row for the
 * first, and the second then sees used_at set and matches nothing.
 *
 * A wrong challenge matches nothing and leaves the code alone, so someone who intercepted
 * the code can't burn the student's real sign-in by trying it first.
 */
export async function useHandoff(codeHash: string, challenge: string): Promise<number | null> {
  const { rows } = await pool.query<{ user_id: number }>(
    `UPDATE desktop_handoffs
     SET used_at = NOW()
     WHERE code_hash = $1 AND challenge = $2 AND used_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    [codeHash, challenge],
  );
  return rows[0]?.user_id ?? null;
}
