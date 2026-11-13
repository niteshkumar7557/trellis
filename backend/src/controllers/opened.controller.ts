// POST /api/opened {topicId}: "Look inside now" on a big topic.

import { isBig, topicById } from "@shared/data";
import type { Request, Response } from "express";
import { z } from "zod";
import { currentUserId } from "../middlewares/auth.middleware.js";
import { openTopic } from "../repos/opened.repo.js";
import { HttpError } from "../utils/http-error.js";

export const PostOpenedBody = z.object({ topicId: z.string().min(1).max(100) });

/** → 204. */
export async function postOpened(req: Request, res: Response) {
  const { topicId } = req.body as z.infer<typeof PostOpenedBody>;
  const topic = topicById.get(topicId);
  if (!topic) throw new HttpError(400, "invalid_request", "No such topic.");
  // Only big topics open into subtopics. Storing a subtopic here would be harmless but
  // meaningless, and a sign the frontend sent the wrong id: better to hear about it.
  if (!isBig(topic)) throw new HttpError(400, "invalid_request", "Only a big topic can be opened.");

  await openTopic(currentUserId(req), topicId);
  res.sendStatus(204);
}
