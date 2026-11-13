// PUT /api/goals/:subjectId {goalId}: the student picks (or changes) a subject's goal.

import { goalById, subjectById } from "@shared/data";
import type { SubjectId } from "@shared/types";
import type { Request, Response } from "express";
import { z } from "zod";
import { currentUserId } from "../middlewares/auth.middleware.js";
import { setGoal } from "../repos/goals.repo.js";
import { HttpError } from "../utils/http-error.js";

export const PutGoalBody = z.object({ goalId: z.string().min(1).max(100) });

/**
 * PUT and not POST: the request says "this subject's goal IS this", and sending it twice
 * leaves the same state as sending it once.
 */
export async function putGoal(req: Request<{ subjectId: string }>, res: Response) {
  const { subjectId } = req.params;
  const { goalId } = req.body as z.infer<typeof PutGoalBody>;

  // Checked against shared/data, the same files the frontend and shared/graph.ts use, so
  // it works whether or not Neo4j is up.
  if (!subjectById.has(subjectId as SubjectId)) {
    throw new HttpError(404, "not_found", "No such subject.");
  }
  // A goal from the other subject would be a valid id with the wrong meaning: the map
  // would compute a route through topics that aren't on it.
  if (goalById.get(goalId)?.subjectId !== subjectId) {
    throw new HttpError(400, "invalid_request", "That goal isn't one of this subject's goals.");
  }

  res.json(await setGoal(currentUserId(req), subjectId as SubjectId, goalId));
}
