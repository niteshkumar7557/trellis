// The helper: one conversation per subject (design.md §7, backend-design.md §5).
//
//   GET  /api/helper/:subjectId/messages?before=<id>&limit=50   older history
//   POST /api/helper/:subjectId/messages                         a message or a tap
//
// What a POST does:
//   1. load the student's record and work out statuses   (shared/graph.ts)
//   2. READ the message into a Reading                    (GLM 5, else the rules: also
//                                                           at a spending limit)
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
import { readByModel } from "../ai/reader.js";
import config from "../config/index.js";
import pool, { inTransaction } from "../db/index.js";
import { currentUserId } from "../middlewares/auth.middleware.js";
import { findMessages, insertMessage, listMessages, messageExists, typedToday } from "../repos/chat.repo.js";
import { listCheckIns } from "../repos/check-ins.repo.js";
import { listClaims } from "../repos/claims.repo.js";
import { listExperiences } from "../repos/experiences.repo.js";
import { listGoals } from "../repos/goals.repo.js";
import { listOpened } from "../repos/opened.repo.js";
import { HttpError } from "../utils/http-error.js";
import { uuidOr404 } from "../utils/row-id.js";
import { usageFor } from "./usage.controller.js";

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

/** → 201 { messages: [studentMessage, helperReply], usage } */
export async function postMessage(req: Request<{ subjectId: string }>, res: Response) {
  const userId = currentUserId(req);
  const subjectId = subjectOr404(req.params.subjectId);
  const body = req.body as z.infer<typeof PostMessageBody>;

  if ("pick" in body) {
    const wrong = body.pick.topicIds.filter((id) => topicById.get(id)?.subjectId !== subjectId);
    if (wrong.length) throw new HttpError(400, "invalid_request", "Those topics aren't in this subject.");
  }

  // The daily limit on TYPED messages (backend-design.md §5 "Cost limits"). This one is
  // not about money (the spending limits are, and they are checked where a model call
  // is reserved, in src/ai/bedrock.ts): it stops a script with a student's token from
  // filling the chat table with messages the rules would read for free. Taps are never
  // limited: marking a topic must always work. Two messages sent at the same moment can
  // both pass at 99; one over the limit is harmless.
  if ("text" in body && (await typedToday(userId)) >= config.ai.helper_daily_messages) {
    throw new HttpError(
      429,
      "daily_limit",
      `That's ${config.ai.helper_daily_messages} typed messages today, the daily limit. The Got it, Partly and Stuck buttons still work, and typing opens again at 05:30 India time.`,
    );
  }

  const ctx = await loadContext(userId, subjectId, "text" in body ? (body.selected ?? null) : null);

  // A tap needs no reading: our own code knows what was tapped, so it never calls the
  // model. Typed text goes to GLM 5 when the AI is on and no spending limit is reached
  // (this account's day or week, the site's day); if that gives nothing usable (null),
  // the rules read it, so the student always gets a reply.
  let reading: Reading;
  let readBy: "tap" | "model" | "rules";
  let studentText: string;
  if ("pick" in body) {
    reading = readTap(body.pick.outcome, body.pick.topicIds);
    readBy = "tap";
    studentText = body.pick.label;
  } else {
    const byModel = await readByModel(body.text, ctx, userId);
    reading = byModel ?? readByRules(body.text, ctx);
    readBy = byModel ? "model" : "rules";
    studentText = body.text;
  }
  const reply = replyFor(reading, ctx);

  const ids = await inTransaction(async (db) => [
    await insertMessage(db, userId, subjectId, { role: "student", text: studentText, readBy }),
    await insertMessage(db, userId, subjectId, { role: "helper", ...reply }),
  ]);
  // The allowance after this message, so the meter moves with the reply. Read after the
  // model call has been settled, so it shows this message's real cost.
  res.status(201).json({ messages: await findMessages(userId, ids), usage: await usageFor(userId) });
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
