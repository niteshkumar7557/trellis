// The helper's conversations (chat_messages, migration 0012) and the proposals their
// confirm cards show (proposals, migration 0014).
//
// A confirm card is stored as just { type: "confirm", proposalId }. What it proposes and
// whether it was saved live in `proposals`, which is the one place they change (Save,
// Cancel, Undo). On the way out, each confirm card is filled in from its proposal, so the
// frontend gets the full `Card` shape from shared/types.ts and never sees two copies
// that could disagree.

import { randomUUID } from "node:crypto";
import type { Reply } from "@shared/helper";
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

const COLUMNS = "id, subject_id, role, text, cards, asks, at";

/**
 * The latest `limit` messages of one subject, oldest first (the order a thread is read),
 * and whether older ones exist. `limit` null means all of them (the export).
 *
 * `before` pages backwards: only messages older than that message. It is a cursor (a
 * position in the list), not an offset: with "skip 50", a new message arriving between
 * two page loads would shift everything by one and show a message twice. Messages are
 * ordered by (at, id), so two messages with the same time still have a fixed order.
 *
 * It fetches one row more than asked: if that extra row exists, there is more history.
 * That answers "is there more?" without a second COUNT query.
 */
export async function listMessages(
  userId: number,
  subjectId: SubjectId,
  limit: number | null,
  db: Db = pool,
  before: string | null = null,
): Promise<{ messages: ChatMessage[]; more: boolean }> {
  const { rows } = await db.query<MessageRow>(
    `SELECT ${COLUMNS}
     FROM chat_messages
     WHERE user_id = $1 AND subject_id = $2
       AND ($4::uuid IS NULL
            OR (at, id) < (SELECT at, id FROM chat_messages WHERE id = $4 AND user_id = $1))
     ORDER BY at DESC, id DESC
     LIMIT $3`,
    [userId, subjectId, limit === null ? null : limit + 1, before],
  );
  const more = limit !== null && rows.length > limit;
  const page = (more ? rows.slice(0, limit) : rows).reverse();
  return { messages: await toMessages(page, userId, db), more };
}

/** Is this one of the student's messages in this subject? (A paging cursor must be.) */
export async function messageExists(userId: number, subjectId: SubjectId, id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    "SELECT 1 FROM chat_messages WHERE id = $1 AND user_id = $2 AND subject_id = $3",
    [id, userId, subjectId],
  );
  return rowCount === 1;
}

/** These messages in the API's shape (confirm cards filled in), oldest first. */
export async function findMessages(userId: number, ids: string[], db: Db = pool): Promise<ChatMessage[]> {
  const { rows } = await db.query<MessageRow>(
    `SELECT ${COLUMNS} FROM chat_messages WHERE user_id = $1 AND id = ANY($2::uuid[]) ORDER BY at, id`,
    [userId, ids],
  );
  return toMessages(rows, userId, db);
}

/**
 * Stores one message and returns its id. A helper message with a confirm card also gets
 * its proposal row, and any older open proposal in this subject is cancelled first, so a
 * stale card can never be saved later (the unique index proposals_one_open is the
 * backstop if this code ever forgets). Call it inside a transaction: the message, the
 * proposal and the cancel succeed or fail together.
 *
 * `at` is clock_timestamp(), not NOW(). Inside a transaction NOW() is the same for every
 * statement, so the student's message and the reply would share a time and their order
 * would depend on random ids. clock_timestamp() moves on between statements.
 */
export async function insertMessage(
  db: Db,
  userId: number,
  subjectId: SubjectId,
  message: { role: "student"; text: string; readBy: "tap" | "model" | "rules" } | ({ role: "helper" } & Reply),
): Promise<string> {
  const messageId = randomUUID();
  let proposal: { id: string; payload: Proposal } | null = null;
  let cards: StoredCard[] | null = null;

  if (message.role === "helper" && message.cards?.length) {
    cards = message.cards.map((c): StoredCard => {
      if (c.type !== "confirm") return c;
      // The id is made here, not by Postgres, because the message must name it before the
      // proposal row exists (the proposal points back at the message).
      proposal = { id: randomUUID(), payload: c.proposal };
      return { type: "confirm", proposalId: proposal.id };
    });
  }

  if (proposal) {
    await db.query(
      `UPDATE proposals SET state = 'cancelled', decided_at = NOW()
       WHERE user_id = $1 AND subject_id = $2 AND state = 'open'`,
      [userId, subjectId],
    );
  }

  await db.query(
    `INSERT INTO chat_messages (id, user_id, subject_id, role, text, cards, asks, read_by, at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, clock_timestamp())`,
    [
      messageId,
      userId,
      subjectId,
      message.role,
      message.text,
      cards ? JSON.stringify(cards) : null,
      message.role === "helper" && message.asks ? JSON.stringify(message.asks) : null,
      message.role === "student" ? message.readBy : null,
    ],
  );

  if (proposal) {
    const p: { id: string; payload: Proposal } = proposal;
    await db.query(
      "INSERT INTO proposals (id, user_id, subject_id, message_id, payload) VALUES ($1, $2, $3, $4, $5)",
      [p.id, userId, subjectId, messageId, JSON.stringify(p.payload)],
    );
  }
  return messageId;
}

/**
 * How many messages this student TYPED since midnight UTC, in every subject. Taps
 * (read_by 'tap') don't count: they never call the model, and the daily limit must never
 * stop a student from marking a topic. Counted from the table, so a restart doesn't
 * reset it.
 */
export async function typedToday(userId: number): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM chat_messages
     WHERE user_id = $1 AND role = 'student' AND read_by IN ('model', 'rules')
       AND at >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
    [userId],
  );
  return rows[0]!.n;
}
