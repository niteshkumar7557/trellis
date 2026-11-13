// Every SQL statement about the `users` row itself. Tokens are in auth.repo.ts.
// Emails arrive here already trimmed and lower-cased (the zod schemas do it), so a plain
// `email = $1` is enough; the UNIQUE constraint on users.email then means one account per
// address whatever the capitals.

import type { Student } from "@shared/types";
import pool from "../db/index.js";
import { listGoals } from "./goals.repo.js";

export interface LoginRow {
  id: number;
  hashed_password: string | null; // null for an account that signs in with Google only
}

export async function findLoginByEmail(email: string): Promise<LoginRow | null> {
  const { rows } = await pool.query<LoginRow>(
    "SELECT id, hashed_password FROM users WHERE email = $1",
    [email],
  );
  return rows[0] ?? null;
}

/**
 * Creates a password account and returns its id, or null when the email is taken.
 *
 * ON CONFLICT DO NOTHING instead of "SELECT first, then INSERT": two sign-ups for the same
 * address at the same moment could both pass the SELECT. The unique constraint decides
 * instead, and RETURNING gives no row for the loser.
 */
export async function createPasswordUser(name: string, email: string, hashedPassword: string): Promise<number | null> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO users (name, email, hashed_password) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [name, email, hashedPassword],
  );
  return rows[0]?.id ?? null;
}

/** The `Student` shape the frontend uses (shared/types.ts), or null if the account is gone. */
export async function getStudent(userId: number): Promise<Student | null> {
  const { rows } = await pool.query<{
    id: number;
    name: string;
    email: string;
    joined_at: Date;
    has_password: boolean;
  }>(
    // hashed_password never leaves this query: only whether there is one.
    `SELECT id, name, email, joined_at, hashed_password IS NOT NULL AS has_password
     FROM users WHERE id = $1`,
    [userId],
  );
  const user = rows[0];
  if (!user) return null;

  return {
    id: String(user.id), // shared/types.ts uses string ids; Postgres uses a number
    name: user.name,
    email: user.email,
    joinedAt: user.joined_at.toISOString(),
    hasPassword: user.has_password,
    goals: await listGoals(userId),
  };
}

/** Returns false when there is no such user (the account was deleted meanwhile). */
export async function updateName(userId: number, name: string): Promise<boolean> {
  const { rowCount } = await pool.query("UPDATE users SET name = $2 WHERE id = $1", [userId, name]);
  return rowCount === 1;
}
