// The signed-in student's own account. Every query uses the id from the token, never one
// from the URL or the body, so a student can only ever reach their own row.

import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import { z } from "zod";
import { currentUserId } from "../middlewares/auth.middleware.js";
import { deleteUser, findLoginById, getStudent, updateName } from "../repos/users.repo.js";
import { HttpError } from "../utils/http-error.js";
import { Name, clearRefreshCookie } from "./auth.controller.js";

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

// Optional: a Google-only account has no password to give. The default covers a DELETE
// sent with no body at all, which Express 5 leaves as `undefined`.
export const DeleteMeBody = z.object({ password: z.string().max(200).optional() }).default({});

/**
 * DELETE /api/me {password?} → 204. Deletes the account and the whole record with it.
 *
 * The password is asked for again because an access token alone is not enough for
 * something that can't be undone: a laptop left open in a lab would otherwise be one
 * click from losing everything.
 *
 * 403, not 401, for a wrong password: the frontend answers every 401 by refreshing the
 * token and retrying, which would just repeat the wrong password.
 */
export async function deleteMe(req: Request, res: Response) {
  const userId = currentUserId(req);
  const { password } = req.body as z.infer<typeof DeleteMeBody>;

  const login = await findLoginById(userId);
  if (!login) throw gone();
  if (login.hashed_password !== null) {
    const ok = password !== undefined && (await bcrypt.compare(password, login.hashed_password));
    if (!ok) throw new HttpError(403, "wrong_password", "That password isn't right.");
  }

  await deleteUser(userId);
  clearRefreshCookie(res);
  res.sendStatus(204);
}
