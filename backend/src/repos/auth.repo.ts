// Every SQL statement about sign-in secrets: refresh tokens (and, from M2.2, reset links).
// Only hashes reach the database. The functions take the hash, not the token, so it is
// obvious at each call site that the plain token is never stored.

import pool from "../db/index.js";
import config from "../config/index.js";

export async function saveRefreshToken(userId: number, tokenHash: string): Promise<void> {
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + make_interval(days => $3))`,
    [userId, tokenHash, config.refresh_token_days],
  );
}

/**
 * The user id behind a live refresh token, or null. Using the token also pushes its expiry
 * out to 60 days from now, so the clock runs from the last visit, not from sign-up.
 *
 * One UPDATE ... RETURNING does the check and the extension together: there is no moment
 * between "is it valid?" and "extend it" for a logout to slip into.
 */
export async function useRefreshToken(tokenHash: string): Promise<number | null> {
  const { rows } = await pool.query<{ user_id: number }>(
    `UPDATE refresh_tokens
     SET expires_at = NOW() + make_interval(days => $2)
     WHERE token_hash = $1 AND expires_at > NOW()
     RETURNING user_id`,
    [tokenHash, config.refresh_token_days],
  );
  return rows[0]?.user_id ?? null;
}

export async function deleteRefreshToken(tokenHash: string): Promise<void> {
  await pool.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [tokenHash]);
}

