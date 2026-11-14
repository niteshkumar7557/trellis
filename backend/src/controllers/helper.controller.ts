// The helper: one conversation per subject (design.md §7, backend-design.md §5).
//
//   GET  /api/helper/:subjectId/messages?before=<id>&limit=50   older history
//   POST /api/helper/:subjectId/messages                         a message or a tap
//
// What a POST does:
//   1. load the student's record and work out statuses   (shared/graph.ts)
//   2. READ the message into a Reading                    (rules today; GLM 5 in M5)
//   3. REPLY with replyFor()                               (shared/helper.ts)
//   4. store the student's message, the reply and any proposal, in ONE transaction
// Nothing here writes a check-in or an experience. Only saving a proposal does (M4.3).

import { goalById, subjectById, topicById } from "@shared/data";
import { deriveStatuses } from "@shared/graph";
import { readByRules, readTap, replyFor, type HelperContext, type Reading } from "@shared/helper";
import type { SubjectId } from "@shared/types";
import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { z } from "zod";
import pool, { inTransaction } from "../db/index.js";
import { currentUserId } from "../middlewares/auth.middleware.js";
import { findMessages, insertMessage, listMessages, messageExists } from "../repos/chat.repo.js";
import { listCheckIns } from "../repos/check-ins.repo.js";
import { listClaims } from "../repos/claims.repo.js";
import { listExperiences } from "../repos/experiences.repo.js";
import { listGoals } from "../repos/goals.repo.js";
import { listOpened } from "../repos/opened.repo.js";
import { HttpError } from "../utils/http-error.js";
import { uuidOr404 } from "../utils/row-id.js";

// The helper looks back this far for context: the question it just asked, and the topic
// last discussed ("finished it" means that one). 50 is several sessions; older messages
// can't change a reply.
const CONTEXT_MESSAGES = 50;

/** The subject in the URL, checked against shared/data. */
export function subjectOr404(id: string): SubjectId {
  if (!subjectById.has(id as SubjectId)) throw new HttpError(404, "not_found", "No such subject.");
  return id as SubjectId;
}

/**
 * Everything shared/helper.ts needs to answer, built from the database the same way the
 * frontend builds it from its store (frontend/components/map/useHelper.ts toContext).
 * `db` lets a caller read inside its own transaction (M4.3's save does).
 */
export async function loadContext(
  userId: number,
  subjectId: SubjectId,
  selected: string | null,
  db: Pick<PoolClient, "query"> = pool,
): Promise<HelperContext> {
  const [claims, checkIns, experiences, goals, opened, thread] = await Promise.all([
    listClaims(userId, db),
    listCheckIns(userId, db),
    listExperiences(userId, db),
    listGoals(userId, db),
    listOpened(userId, db),
    listMessages(userId, subjectId, CONTEXT_MESSAGES, db),
  ]);
  const goalId = goals.find((g) => g.subjectId === subjectId)?.goalId;
  // A topic id from the browser is a hint, not a fact: ignore it unless it is a real
  // topic of this subject.
  const sel = selected ? topicById.get(selected) : undefined;
  return {
    subjectId,
    goal: goalId ? (goalById.get(goalId) ?? null) : null,
    // Derived on every request, never stored (backend-design.md §7).
    statuses: deriveStatuses(claims, checkIns),
    claims,
    checkIns,
    experiences,
    messages: thread.messages,
    selected: sel && sel.subjectId === subjectId ? sel.id : null,
    opened,
  };
}

// ------------------------------------------------------------------ POST a message

// Either typed text or a tap. z.union tries each shape in turn. Both are .strict()
// (unknown fields are an error, not dropped), so a body with both `text` and `pick` is
// refused rather than half-read as whichever shape matched first.
export const PostMessageBody = z.union([
  z
    .object({
      text: z.string().trim().min(1).max(2000),
      selected: z.string().max(100).nullish(),
    })
    .strict(),
  z
    .object({
      pick: z.object({
        outcome: z.enum(["got", "partly", "stuck"]),
        topicIds: z.array(z.string().max(100)).min(1).max(20),
        // What the button said ("Got it", "FlatList"): shown as the student's message.
        label: z.string().trim().min(1).max(200),
      }),
    })
    .strict(),
]);

/** → 201 { messages: [studentMessage, helperReply] } */
export async function postMessage(req: Request<{ subjectId: string }>, res: Response) {
  const userId = currentUserId(req);
  const subjectId = subjectOr404(req.params.subjectId);
  const body = req.body as z.infer<typeof PostMessageBody>;

  if ("pick" in body) {
    const wrong = body.pick.topicIds.filter((id) => topicById.get(id)?.subjectId !== subjectId);
    if (wrong.length) throw new HttpError(400, "invalid_request", "Those topics aren't in this subject.");
  }

  const ctx = await loadContext(userId, subjectId, "text" in body ? (body.selected ?? null) : null);

  // A tap needs no reading: our own code knows what was tapped. Typed text is read by the
  // rules; M5 tries GLM 5 first and keeps these rules as the fallback.
  let reading: Reading;
  let readBy: "tap" | "rules";
  let studentText: string;
  if ("pick" in body) {
    reading = readTap(body.pick.outcome, body.pick.topicIds);
    readBy = "tap";
    studentText = body.pick.label;
  } else {
    reading = readByRules(body.text, ctx);
    readBy = "rules";
    studentText = body.text;
  }
  const reply = replyFor(reading, ctx);

  const ids = await inTransaction(async (db) => [
    await insertMessage(db, userId, subjectId, { role: "student", text: studentText, readBy }),
    await insertMessage(db, userId, subjectId, { role: "helper", ...reply }),
  ]);
  res.status(201).json({ messages: await findMessages(userId, ids) });
}

// ------------------------------------------------------------------ GET older history

export const HistoryQuery = z.object({
  before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/** → { messages, more }: the page of messages just before `before`, oldest first. */
export async function getMessages(req: Request<{ subjectId: string }>, res: Response) {
  const userId = currentUserId(req);
  const subjectId = subjectOr404(req.params.subjectId);
  const parsed = HistoryQuery.safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, "invalid_request", "limit must be a number from 1 to 100.");
  const { before, limit } = parsed.data;

  if (before !== undefined) {
    uuidOr404(before, "message");
    // An unknown cursor would quietly return nothing; say so instead.
    if (!(await messageExists(userId, subjectId, before))) throw new HttpError(404, "not_found", "No such message.");
  }
  res.set("Cache-Control", "no-store");
  res.json(await listMessages(userId, subjectId, limit, pool, before ?? null));
}
