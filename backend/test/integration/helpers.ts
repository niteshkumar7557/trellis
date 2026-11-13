import request from "supertest";
import app from "../../src/app.js";
import pool from "../../src/db/index.js";
import driver from "../../src/db/neo4j.js";

/** Runs one Cypher query and returns each row as a plain object. */
export async function cypher(query: string, params: Record<string, unknown> = {}) {
  const { records } = await driver.executeQuery(query, params);
  return records.map((r) => r.toObject());
}

// ------------------------------------------------------------------ Postgres helpers


/**
 * Registers a fresh student through the real API and returns their user id and an
 * Authorization header. `domain` keeps each test file's users apart, so a file's
 * clean-up (deleteUsers) never touches another file's.
 */
export async function registerStudent(domain: string, name = "Test") {
  const email = `${name.toLowerCase().replace(/\W/g, "")}-${Date.now()}${domain}`;
  const res = await request(app).post("/api/auth/register").send({ name, email, password: "correct horse" });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return {
    userId: Number(res.body.student.id),
    email,
    auth: { Authorization: `Bearer ${res.body.accessToken}` },
    refreshCookie: ([] as string[]).concat(res.headers["set-cookie"] ?? []).find((c) => c.startsWith("refresh_token="))!,
  };
}

/** Deletes every account in this domain; ON DELETE CASCADE takes their records too. */
export const deleteUsers = (domain: string) => pool.query("DELETE FROM users WHERE email LIKE $1", [`%${domain}`]);

/**
 * A check-in as if the helper had saved it: a helper message, a saved proposal pointing
 * at it, and the check-in pointing at the proposal. Until M4.3 there is no route that
 * does this, so the tests write the rows themselves.
 */
export async function insertSavedCheckIn(userId: number, topicId: string, outcome: string, text: string, at?: string) {
  const msg = await pool.query(
    "INSERT INTO chat_messages (user_id, subject_id, role, text) VALUES ($1, 'react-native', 'helper', 'Saved.') RETURNING id",
    [userId],
  );
  const proposal = await pool.query(
    `INSERT INTO proposals (user_id, subject_id, message_id, state, payload, decided_at)
     VALUES ($1, 'react-native', $2, 'saved', '{}'::jsonb, NOW()) RETURNING id`,
    [userId, msg.rows[0].id],
  );
  const checkIn = await pool.query(
    `INSERT INTO check_ins (user_id, topic_id, outcome, text, proposal_id, at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, NOW())) RETURNING id`,
    [userId, topicId, outcome, text, proposal.rows[0].id, at ?? null],
  );
  return { checkInId: checkIn.rows[0].id as string, messageId: msg.rows[0].id as string, proposalId: proposal.rows[0].id as string };
}

/** An experience as if the helper had saved it (see insertSavedCheckIn). */
export async function insertSavedExperience(userId: number, topicId: string, kind: string, text: string, line = text) {
  const { proposalId, messageId } = await insertSavedCheckIn(userId, topicId, "partly", text);
  const { rows } = await pool.query(
    `INSERT INTO experiences (user_id, topic_id, kind, text, line, proposal_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [userId, topicId, kind, text, line, proposalId],
  );
  return { experienceId: rows[0].id as string, messageId };
}
