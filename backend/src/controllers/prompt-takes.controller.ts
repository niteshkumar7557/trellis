// POST /api/prompt-takes {topicId, via}: the student copied a prompt or opened it in
// ChatGPT or Claude. Sent by the frontend at that moment; no text of the prompt is kept.

import { topicById } from "@shared/data";
import type { Request, Response } from "express";
import { z } from "zod";
import { currentUserId } from "../middlewares/auth.middleware.js";
import { addPromptTake } from "../repos/prompt-takes.repo.js";
import { HttpError } from "../utils/http-error.js";

export const PostPromptTakeBody = z.object({
  topicId: z.string().min(1).max(100),
  via: z.enum(["copy", "chatgpt", "claude"]),
});

/** → 201 PromptTake */
export async function postPromptTake(req: Request, res: Response) {
  const { topicId, via } = req.body as z.infer<typeof PostPromptTakeBody>;
  if (!topicById.has(topicId)) throw new HttpError(400, "invalid_request", "No such topic.");
  res.status(201).json(await addPromptTake(currentUserId(req), topicId, via));
}
