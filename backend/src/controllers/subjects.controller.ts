// HTTP only: read the request, call the repo, shape the response. No Cypher here.
// Express 5 passes a rejected promise to the error handler, so no try/catch is needed.

import type { Request, Response } from "express";
import { getSubjectGraph, getSubjects } from "../repos/graph.repo.js";
import { HttpError } from "../utils/http-error.js";

export async function listSubjects(_req: Request, res: Response) {
  res.json(await getSubjects());
}

/**
 * GET /api/subjects/:subjectId/graph
 *
 * The map is the same for everyone and rarely changes, so browsers and proxies may keep it
 * for an hour. Never do this on a student's own data.
 */
export async function showSubjectGraph(req: Request<{ subjectId: string }>, res: Response) {
  const graph = await getSubjectGraph(req.params.subjectId);
  if (graph === null) throw new HttpError(404, "not_found", "No such subject.");
  res.set("Cache-Control", "public, max-age=3600");
  res.json(graph);
}
