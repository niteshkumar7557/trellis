// The signed-in student's own account. Every query uses the id from the token, never one
// from the URL or the body, so a student can only ever reach their own row.

import type { Request, Response } from "express";
import { z } from "zod";
import { currentUserId } from "../middlewares/auth.middleware.js";
import { getStudent, updateName } from "../repos/users.repo.js";
import { HttpError } from "../utils/http-error.js";
import { Name } from "./auth.controller.js";

// Only the name. The email can't be changed in v1: there is no way yet to prove the
// student owns a new address (backend-design.md §4).
export const PatchMeBody = z.object({ name: Name });

// The account can be deleted between the token being issued and this request; the token
// lives on for up to 15 minutes. 404 says "there is nothing here any more".
const gone = () => new HttpError(404, "not_found", "This account no longer exists.");

/** GET /api/me → Student */
export async function showMe(req: Request, res: Response) {
  const student = await getStudent(currentUserId(req));
  if (!student) throw gone();
  res.json(student);
}

/** PATCH /api/me {name} → Student */
export async function patchMe(req: Request, res: Response) {
  const userId = currentUserId(req);
  const { name } = req.body as z.infer<typeof PatchMeBody>;
  if (!(await updateName(userId, name))) throw gone();
  res.json(await getStudent(userId));
}
