// The student's check-ins: list, fix, remove (Settings → History, and the topic panel).

import { topicById } from "@shared/data";
import type { Request, Response } from "express";
import { z } from "zod";
import { currentUserId } from "../middlewares/auth.middleware.js";
import { deleteCheckIn, listCheckIns, updateCheckIn } from "../repos/check-ins.repo.js";
import { HttpError } from "../utils/http-error.js";
import { uuidOr404 } from "../utils/row-id.js";

// 2,000: the same limit as a helper message, since the text is usually the student's words.
export const PatchCheckInBody = z
  .object({
    topicId: z.string().min(1).max(100).optional(),
    outcome: z.enum(["got", "partly", "stuck"]).optional(),
    text: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((b) => b.topicId !== undefined || b.outcome !== undefined || b.text !== undefined, {
    message: "Send at least one of topicId, outcome, text.",
  });

const notFound = () => new HttpError(404, "not_found", "No such check-in.");

/** GET /api/check-ins → CheckIn[], newest first */
export async function showCheckIns(req: Request, res: Response) {
  res.json(await listCheckIns(currentUserId(req)));
}

/** PATCH /api/check-ins/:id {topicId?, outcome?, text?} → CheckIn */
export async function patchCheckIn(req: Request<{ id: string }>, res: Response) {
  const id = uuidOr404(req.params.id, "check-in");
  const changes = req.body as z.infer<typeof PatchCheckInBody>;

  if (changes.topicId !== undefined) {
    const topic = topicById.get(changes.topicId);
    // A check-in is always on a subtopic: statuses of big topics are worked out from
    // their subtopics (backend-design.md §7), so a check-in on one would be ignored.
    if (!topic || topic.parentId === null) {
      throw new HttpError(400, "invalid_request", "A check-in must be on a subtopic.");
    }
  }

  const updated = await updateCheckIn(currentUserId(req), id, changes);
  if (!updated) throw notFound();
  res.json(updated);
}

/** DELETE /api/check-ins/:id → 204 */
export async function removeCheckIn(req: Request<{ id: string }>, res: Response) {
  const id = uuidOr404(req.params.id, "check-in");
  if (!(await deleteCheckIn(currentUserId(req), id))) throw notFound();
  res.sendStatus(204);
}
