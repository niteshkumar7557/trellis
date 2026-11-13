// Reading the helper's conversations (chat_messages, migration 0012). Writing them comes
// with the helper in M4.
//
// A confirm card is stored as just { type: "confirm", proposalId }. What it proposes and
// whether it was saved live in `proposals`, which is the one place they change (Save,
// Cancel, Undo). On the way out, each confirm card is filled in from its proposal, so the
// frontend gets the full `Card` shape from shared/types.ts and never sees two copies
// that could disagree.

import type { Card, ChatMessage, Proposal, SubjectId } from "@shared/types";
import type { PoolClient } from "pg";
import pool from "../db/index.js";

type Db = Pick<PoolClient, "query">;

/** A card as stored: a confirm card holds only its proposal's id. */
type StoredCard = Exclude<Card, { type: "confirm" }> | { type: "confirm"; proposalId: string };

interface MessageRow {
  id: string;
  subject_id: SubjectId;
  role: ChatMessage["role"];
  text: string;
  cards: StoredCard[] | null;
  asks: ChatMessage["asks"] | null;
  at: Date;
}

interface ProposalRow {
  id: string;
  state: "open" | "saved" | "cancelled" | "undone";
  payload: Proposal;
  check_in_ids: string[];
  experience_ids: string[];
}

/** Fills the confirm cards of these messages from their proposals, in one query. */
async function toMessages(rows: MessageRow[], userId: number, db: Db): Promise<ChatMessage[]> {
  const proposalIds = rows.flatMap((r) => (r.cards ?? []).flatMap((c) => (c.type === "confirm" ? [c.proposalId] : [])));

  const proposals = new Map<string, ProposalRow>();
  if (proposalIds.length > 0) {
    // The saved ids are what Undo would remove; the card shows them. array_agg over a
    // LEFT JOIN gives {NULL} when there are none, hence the FILTER.
    const { rows: found } = await db.query<ProposalRow>(
      `SELECT p.id, p.state, p.payload,
              COALESCE((SELECT array_agg(c.id ORDER BY c.at) FROM check_ins c WHERE c.proposal_id = p.id), '{}') AS check_in_ids,
              COALESCE((SELECT array_agg(e.id ORDER BY e.at) FROM experiences e WHERE e.proposal_id = p.id), '{}') AS experience_ids
       FROM proposals p
       WHERE p.user_id = $1 AND p.id = ANY($2::uuid[])`,
      [userId, proposalIds],
    );
    for (const p of found) proposals.set(p.id, p);
  }

  return rows.map((r): ChatMessage => {
    const cards = (r.cards ?? []).flatMap((c): Card[] => {
      if (c.type !== "confirm") return [c];
      const p = proposals.get(c.proposalId);
      // A card whose proposal is gone can't be shown truthfully: drop it, keep the text.
      if (!p) return [];
      return [
        {
          type: "confirm",
          proposalId: p.id,
          proposal: p.payload,
          state: p.state,
          ...(p.state === "saved" ? { saved: { checkIns: p.check_in_ids, experiences: p.experience_ids } } : {}),
        },
      ];
    });
    return {
      id: r.id,
      subjectId: r.subject_id,
      at: r.at.toISOString(),
      role: r.role,
      text: r.text,
      ...(cards.length > 0 ? { cards } : {}),
      ...(r.asks ? { asks: r.asks } : {}),
    };
  });
}

/**
 * The latest `limit` messages of one subject, oldest first (the order a thread is read),
 * and whether older ones exist. `limit` null means all of them (the export).
 *
 * It fetches one row more than asked: if that extra row exists, there is more history.
 * That answers "is there more?" without a second COUNT query.
 */
export async function listMessages(
  userId: number,
  subjectId: SubjectId,
  limit: number | null,
  db: Db = pool,
): Promise<{ messages: ChatMessage[]; more: boolean }> {
  const { rows } = await db.query<MessageRow>(
    `SELECT id, subject_id, role, text, cards, asks, at
     FROM chat_messages
     WHERE user_id = $1 AND subject_id = $2
     ORDER BY at DESC, id DESC
     LIMIT $3`,
    [userId, subjectId, limit === null ? null : limit + 1],
  );
  const more = limit !== null && rows.length > limit;
  const page = (more ? rows.slice(0, limit) : rows).reverse();
  return { messages: await toMessages(page, userId, db), more };
}
