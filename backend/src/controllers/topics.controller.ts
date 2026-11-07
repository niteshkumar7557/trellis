import type { Request, Response } from "express";
import { findPath } from "../repos/paths.repo.js";
import { HttpError } from "../utils/http-error.js";

/** GET /api/topics/:topicId/path-to/:targetId */
export async function showPathTo(req: Request<{ topicId: string; targetId: string }>, res: Response) {
  const path = await findPath(req.params.topicId, req.params.targetId);
  if (path === null) throw new HttpError(404, "not_found", "No such topic.");
  res.json(path);
}
