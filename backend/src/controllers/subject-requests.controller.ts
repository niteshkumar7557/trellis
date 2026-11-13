// POST /api/subject-requests {text}: a subject Trellis doesn't have yet. The page answers
// with a fixed "Coming soon" whatever is typed; this only keeps a note of what was asked.

import type { Request, Response } from "express";
import { z } from "zod";
import { currentUserId } from "../middlewares/auth.middleware.js";
import { addSubjectRequest } from "../repos/subject-requests.repo.js";

// 120 matches the column (VARCHAR(120)). Checked here too, so a long text answers 400
// with a reason instead of a 500 from the database.
export const PostSubjectRequestBody = z.object({ text: z.string().trim().min(1).max(120) });

/** → 204 */
export async function postSubjectRequest(req: Request, res: Response) {
  const { text } = req.body as z.infer<typeof PostSubjectRequestBody>;
  await addSubjectRequest(currentUserId(req), text);
  res.sendStatus(204);
}
