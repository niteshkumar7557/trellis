// What the student said at the sort (claims, migration 0009).

import type { Claim, ClaimKind } from "@shared/types";
import pool from "../db/index.js";

/**
 * Saves a batch of claims in ONE statement and returns them as saved.
 *
 * unnest() turns two parallel arrays into rows, so 40 cards from the sort are one round
 * trip and one implicit transaction: all saved, or none. The alternative, one INSERT per
 * card in a loop, is 40 round trips and needs an explicit transaction to be all-or-none.
 * All rows get the same NOW(), which is why the controller removes duplicates first.
 */
export async function addClaims(userId: number, claims: { topicId: string; claim: ClaimKind }[]): Promise<Claim[]> {
  const { rows } = await pool.query<{ topic_id: string; claim: ClaimKind; at: Date }>(
    `INSERT INTO claims (user_id, topic_id, claim)
     SELECT $1, t.topic_id, t.claim
     FROM unnest($2::text[], $3::text[]) AS t(topic_id, claim)
     RETURNING topic_id, claim, at`,
    [userId, claims.map((c) => c.topicId), claims.map((c) => c.claim)],
  );
  return rows.map((r) => ({ topicId: r.topic_id, claim: r.claim, at: r.at.toISOString() }));
}
