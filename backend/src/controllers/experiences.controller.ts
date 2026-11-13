// The student fixes or removes what they said about a topic (Settings → My notes). Their
// words go into prompts, so they must be able to see, change and delete every one.

import { tidy } from "@shared/parse";
import type { Request, Response } from "express";
import { z } from "zod";
import { currentUserId } from "../middlewares/auth.middleware.js";
import { deleteExperience, updateExperience } from "../repos/experiences.repo.js";
import { HttpError } from "../utils/http-error.js";
import { uuidOr404 } from "../utils/row-id.js";

export const PatchExperienceBody = z.object({
  text: z.string().trim().min(1).max(500),
  kind: z.enum(["easy", "hard", "clicked"]).optional(),
});

const notFound = () => new HttpError(404, "not_found", "No such note.");

/**
 * PATCH /api/experiences/:id {text, kind?} → Experience
 *
 * `line` (the clean version that goes into prompts) is rebuilt from the new text by the
 * rule-based tidy() in shared/parse.ts, the same one the frontend uses. No AI call: an
 * edit is the student correcting their own words, and a model rewriting them again would
 * undo the point of editing. The client never sends `line`, so a prompt can only ever
 * contain a tidied copy of what the student wrote.
 */
export async function patchExperience(req: Request<{ id: string }>, res: Response) {
  const id = uuidOr404(req.params.id, "note");
  const { text, kind } = req.body as z.infer<typeof PatchExperienceBody>;
  // tidy() strips filler words; text that is nothing but filler ("um, like") would leave
  // an empty line, so keep the student's text as it is in that case.
  const line = tidy(text) || text;
  const updated = await updateExperience(currentUserId(req), id, { text, line, kind });
  if (!updated) throw notFound();
  res.json(updated);
}

/** DELETE /api/experiences/:id → 204 */
export async function removeExperience(req: Request<{ id: string }>, res: Response) {
  const id = uuidOr404(req.params.id, "note");
  if (!(await deleteExperience(currentUserId(req), id))) throw notFound();
  res.sendStatus(204);
}
