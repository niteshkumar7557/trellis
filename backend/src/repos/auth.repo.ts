// Every SQL statement about sign-in secrets: refresh tokens and one-time reset links.
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

// ------------------------------------------------------------------ password resets

/**
 * Makes a one-hour reset link's row for this email and returns the user id, or null when
 * there is no such account. Any older unused link for the same account is deleted first,
 * so only the newest link the admin sent can work.
 */
export async function createPasswordReset(email: string, tokenHash: string): Promise<number | null> {
  const client = await pool.connect(); // one connection: a transaction lives on one connection
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: number }>("SELECT id FROM users WHERE email = $1", [email]);
    const userId = rows[0]?.id;
    if (userId === undefined) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query("DELETE FROM password_resets WHERE user_id = $1 AND used_at IS NULL", [userId]);
    await client.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [userId, tokenHash],
    );
    await client.query("COMMIT");
    return userId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Spends a reset link: sets the new password and signs out every device. Returns false,
 * changing nothing, when the link is unknown, expired or already used.
 *
 * All three writes are one transaction. If setting the password failed after the link was
 * marked used, the student would be left with a dead link and their old password.
 * The guarded UPDATE (`used_at IS NULL`) means two clicks on the same link can't both win:
 * Postgres lets one update the row, and the other then finds nothing to update.
 */
export async function usePasswordReset(tokenHash: string, hashedPassword: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ user_id: number }>(
      `UPDATE password_resets SET used_at = NOW()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       RETURNING user_id`,
      [tokenHash],
    );
    const userId = rows[0]?.user_id;
    if (userId === undefined) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query("UPDATE users SET hashed_password = $2 WHERE id = $1", [userId, hashedPassword]);
    // Whoever knew the old password may be signed in somewhere. Not any more.
    await client.query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
