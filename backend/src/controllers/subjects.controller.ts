// HTTP only: read the request, call the repo, shape the response. No Cypher here.
// Express 5 passes a rejected promise to the error handler, so no try/catch is needed.

import type { Request, Response } from "express";
import { getSubjects } from "../repos/graph.repo.js";

export async function listSubjects(_req: Request, res: Response) {
  res.json(await getSubjects());
}

/**
 * GET /api/subjects/:subjectId/graph
 *
 * TODO(Task B):
 *   - answer with getSubjectGraph(req.params.subjectId)
 *   - no such subject: 404 with code "not_found", thrown as an HttpError
 *   - this content is the same for everyone and rarely changes, so let browsers and proxies
 *     keep it for an hour: Cache-Control: public, max-age=3600
 */
export async function showSubjectGraph(_req: Request, res: Response) {
  res.status(501).json({ error: { code: "not_implemented", message: "Task B" } });
}
