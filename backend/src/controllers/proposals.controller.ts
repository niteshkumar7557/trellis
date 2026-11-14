// Save, Cancel and Undo on a helper's confirm card (backend-design.md §4 "The helper").
//
//   POST /api/helper/proposals/:id/save    {proposal}  → { checkIns, experiences, message, followUp }
//   POST /api/helper/proposals/:id/cancel              → { message }
//   POST /api/helper/proposals/:id/undo                → { message }
//
// Each works once. A second attempt answers 409 proposal_not_open and changes nothing;
// the frontend then reloads that message instead of showing an error.

import { nextTopic, revealed } from "@shared/graph";
import { afterSave, checkInText, type HelperContext } from "@shared/helper";
import { tidy } from "@shared/parse";
import { topicById } from "@shared/data";
import type { Proposal, SubjectId } from "@shared/types";
import type { Request, Response } from "express";
import { z } from "zod";
import { inTransaction } from "../db/index.js";
import { currentUserId } from "../middlewares/auth.middleware.js";
import { findMessages, insertMessage } from "../repos/chat.repo.js";
import { insertCheckIns, listCheckInsOfProposal } from "../repos/check-ins.repo.js";
import { insertExperiences, listExperiencesOfProposal } from "../repos/experiences.repo.js";
import { deleteSavedRows, lockOpenProposal, markSaved, moveState, proposalExists } from "../repos/proposals.repo.js";
import { HttpError } from "../utils/http-error.js";
import { uuidOr404 } from "../utils/row-id.js";
import { loadContext } from "./helper.controller.js";

// The proposal as the student may have edited it on the card. Every field is checked
// again: it was shown by our own UI, but it arrives from a browser like any other input.
export const SaveBody = z.object({
  proposal: z.object({
    updates: z.array(z.object({ topicId: z.string().max(100), outcome: z.enum(["got", "partly", "stuck"]) })).max(20),
    experiences: z
      .array(
        z.object({
          topicId: z.string().max(100),
          kind: z.enum(["easy", "hard", "clicked"]),
          // Empty is allowed here and dropped below: clearing the text is how the card
          // removes a note.
          text: z.string().trim().max(500),
          // Sent back by the card, but never trusted: see cleanExperiences().
          line: z.string().max(500).optional(),
        }),
      )
      .max(10),
    said: z.string().max(2000),
  }),
});

const notFound = () => new HttpError(404, "not_found", "No such proposal.");
const notOpen = () =>
  new HttpError(409, "proposal_not_open", "This was already saved, cancelled or undone. Reload to see where it stands.");

/** 409 if the proposal exists but was already decided; 404 if it isn't theirs at all. */
async function whyNot(userId: number, id: string): Promise<HttpError> {
  return (await proposalExists(userId, id)) ? notOpen() : notFound();
}

/**
 * The experiences to store. Empty texts are dropped. `line` (what goes into prompts) is
 * kept from the proposal as the helper made it when the student left that note
 * unchanged, because in M5 the model writes that line and it is better than tidy()'s.
 * For an edited or new note it is rebuilt with tidy() from the text. Either way the line
 * comes from our side, never from the request: a prompt can't carry text the student
 * didn't write.
 */
function cleanExperiences(edited: z.infer<typeof SaveBody>["proposal"]["experiences"], original: Proposal) {
  return edited
    .filter((e) => e.text !== "")
    .map((e) => {
      const same = original.experiences.find((o) => o.topicId === e.topicId && o.kind === e.kind && o.text.trim() === e.text);
      return { topicId: e.topicId, kind: e.kind, text: e.text, line: same?.line ?? (tidy(e.text) || e.text) };
    });
}

/** Every topic must be a subtopic of the proposal's subject (check-ins are always on one). */
function checkTopics(proposal: Proposal, subjectId: SubjectId) {
  const ids = [...proposal.updates.map((u) => u.topicId), ...proposal.experiences.map((e) => e.topicId)];
  for (const id of ids) {
    const t = topicById.get(id);
    if (!t || t.parentId === null || t.subjectId !== subjectId) {
      throw new HttpError(400, "invalid_request", `${id} isn't a topic you can check in on here.`);
    }
  }
}

/** Big topics open on the map, from a context: to say "that opened X" after saving. */
function openBigTopics(ctx: HelperContext): Set<string> {
  const next = ctx.goal ? nextTopic(ctx.goal, ctx.statuses) : null;
  return revealed(ctx.subjectId, ctx.statuses, ctx.checkIns, next?.id ?? null, ctx.opened, ctx.experiences);
}

/** POST /api/helper/proposals/:id/save */
export async function saveProposal(req: Request<{ id: string }>, res: Response) {
  const userId = currentUserId(req);
  const id = uuidOr404(req.params.id, "proposal");
  const edited = (req.body as z.infer<typeof SaveBody>).proposal;

  // Everything below is one transaction: the proposal becomes saved, its check-ins and
  // experiences exist, and the follow-up reply is stored, or none of it happened.
  const outcome = await inTransaction(async (db) => {
    const open = await lockOpenProposal(db, userId, id);
    if (!open) return null;

    const proposal: Proposal = {
      updates: edited.updates,
      experiences: cleanExperiences(edited.experiences, open.payload),
      said: edited.said,
    };
    checkTopics(proposal, open.subjectId);
    if (proposal.updates.length === 0 && proposal.experiences.length === 0) {
      throw new HttpError(400, "invalid_request", "There's nothing left to save.");
    }

    // What the map looked like before, so the reply can say what this save opened.
    const before = openBigTopics(await loadContext(userId, open.subjectId, null, db));

    await insertCheckIns(
      db,
      userId,
      id,
      proposal.updates.map((u) => ({ ...u, text: checkInText(proposal, u) })),
    );
    await insertExperiences(db, userId, id, proposal.experiences);
    await markSaved(db, id, proposal);

    // The next step (a prompt, the likely cause, the next topic) is worked out from the
    // record AFTER the save, by the same afterSave() the demo uses.
    const after = await loadContext(userId, open.subjectId, null, db);
    const followUpId = await insertMessage(db, userId, open.subjectId, { role: "helper", ...afterSave(proposal, after, before) });
    return { messageId: open.messageId, followUpId };
  });
  if (!outcome) throw await whyNot(userId, id);

  const [message, followUp] = await findMessages(userId, [outcome.messageId, outcome.followUpId]);
  res.json({
    checkIns: await listCheckInsOfProposal(userId, id),
    experiences: await listExperiencesOfProposal(userId, id),
    message,
    followUp,
  });
}

/** POST /api/helper/proposals/:id/cancel: nothing was saved, so nothing to remove. */
export async function cancelProposal(req: Request<{ id: string }>, res: Response) {
  const userId = currentUserId(req);
  const id = uuidOr404(req.params.id, "proposal");
  const messageId = await inTransaction((db) => moveState(db, userId, id, "open", "cancelled"));
  if (!messageId) throw await whyNot(userId, id);
  res.json({ message: (await findMessages(userId, [messageId]))[0] });
}

/**
 * POST /api/helper/proposals/:id/undo: removes exactly what that save created (the rows
 * carrying this proposal's id). The follow-up message stays, as in the demo: it is part
 * of the conversation, and the card above it now says "undone".
 */
export async function undoProposal(req: Request<{ id: string }>, res: Response) {
  const userId = currentUserId(req);
  const id = uuidOr404(req.params.id, "proposal");
  const messageId = await inTransaction(async (db) => {
    const moved = await moveState(db, userId, id, "saved", "undone");
    if (moved) await deleteSavedRows(db, userId, id);
    return moved;
  });
  if (!messageId) throw await whyNot(userId, id);
  res.json({ message: (await findMessages(userId, [messageId]))[0] });
}
