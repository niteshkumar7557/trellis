// Sign-up, login, refresh, logout. How the tokens work and why: backend-design.md §4.
//
// The body schemas live here, next to the handlers that rely on them, and the routes file
// passes them to validateBody(). By the time a handler runs, req.body has been checked and
// cleaned (emails trimmed and lower-cased, unknown fields dropped).

import bcrypt from "bcrypt";
import type { CookieOptions, Request, Response } from "express";
import { z } from "zod";
import config from "../config/index.js";
import { deleteRefreshToken, saveRefreshToken, usePasswordReset, useRefreshToken } from "../repos/auth.repo.js";
import { createPasswordUser, findLoginByEmail, getStudent } from "../repos/users.repo.js";
import { HttpError } from "../utils/http-error.js";
import { hashToken, newRandomToken, signAccessToken } from "../utils/tokens.js";

// ------------------------------------------------------------------ the body schemas

/** Trimmed and lower-cased BEFORE the format check, so " Ada@X.com" is a valid email. */
export const Email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email.").max(254));

/**
 * 8 to 72. The upper limit is in BYTES because bcrypt silently ignores everything after
 * the 72nd byte: a longer password would be cut without telling anyone. (An emoji is four
 * bytes, so 72 bytes can be fewer than 72 characters.)
 */
export const NewPassword = z
  .string()
  .min(8, "Use at least 8 characters.")
  .refine((p) => Buffer.byteLength(p, "utf8") <= 72, "Use at most 72 characters.");

export const Name = z.string().trim().min(1, "Enter your name.").max(60);

export const RegisterBody = z.object({ name: Name, email: Email, password: NewPassword });

// Login does not apply the 8-to-72 rule: it only checks. The max stops anyone sending a
// megabyte for bcrypt to chew on.
export const LoginBody = z.object({ email: Email, password: z.string().min(1).max(200) });

// The token is what `npm run reset-link` put in the link: 64 hex characters.
export const ResetPasswordBody = z.object({ token: z.string().min(1).max(200), password: NewPassword });

// ------------------------------------------------------------------ the cookie

const REFRESH_COOKIE = "refresh_token";

/**
 * - httpOnly: page scripts can't read it, so an injected script can't steal it.
 * - secure in production: only sent over HTTPS. (Off locally, where there is no HTTPS.)
 * - sameSite strict: the browser never sends it on a request started by another site,
 *   which is what blocks cross-site request forgery. Possible because the API and the
 *   pages share one origin (backend-design.md §2).
 * - path /api/auth: it travels only to the auth routes, not with every request.
 */
function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.is_production,
    sameSite: "strict",
    path: "/api/auth",
    maxAge: config.refresh_token_days * 24 * 60 * 60 * 1000,
  };
}

/** Makes a refresh token, stores its hash, and puts the token itself in the cookie. */
async function startSession(res: Response, userId: number) {
  const token = newRandomToken();
  await saveRefreshToken(userId, hashToken(token));
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
  return signAccessToken(userId);
}

async function sendSignedIn(res: Response, userId: number, status: number) {
  const accessToken = await startSession(res, userId);
  const student = await getStudent(userId);
  res.status(status).json({ accessToken, student });
}

// ------------------------------------------------------------------ the handlers

/** POST /api/auth/register {name, email, password} → 201 {accessToken, student} */
export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body as z.infer<typeof RegisterBody>;

  // Cost 12: about a quarter of a second per hash on a small server. Slow on purpose, so a
  // stolen hash takes years to guess; fast enough that nobody waits for it.
  const hashed = await bcrypt.hash(password, 12);
  const userId = await createPasswordUser(name, email, hashed);
  if (userId === null) {
    throw new HttpError(409, "email_taken", "An account with this email already exists. Log in instead.");
  }
  await sendSignedIn(res, userId, 201);
}

/**
 * Compared against when the email is unknown, so a wrong email takes as long as a wrong
 * password. Without it, timing the reply would tell an attacker which emails have
 * accounts, the very thing the single error message hides. (A cost-12 hash of a random
 * string nobody knows.)
 */
const NO_SUCH_USER_HASH = "$2b$12$PBB412dTIsJlOI0lxMG5b.TZTAByjXocwT8h4gsRWh0uOnGFz284m";

/** POST /api/auth/login {email, password} → 200 {accessToken, student} */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body as z.infer<typeof LoginBody>;

  const user = await findLoginByEmail(email);
  const ok = await bcrypt.compare(password, user?.hashed_password ?? NO_SUCH_USER_HASH);

  // One answer for an unknown email, a wrong password, and a Google-only account (which
  // has no password): the reply never says which part was wrong.
  if (!user || !user.hashed_password || !ok) {
    throw new HttpError(401, "invalid_credentials", "That email and password don't match.");
  }
  await sendSignedIn(res, user.id, 200);
}

/** POST /api/auth/refresh (the cookie) → 200 {accessToken} */
export async function refresh(req: Request, res: Response) {
  const token: unknown = req.cookies?.[REFRESH_COOKIE];
  const userId = typeof token === "string" ? await useRefreshToken(hashToken(token)) : null;
  if (userId === null) {
    // A dead cookie is no use to the browser; remove it so it stops being sent.
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
    throw new HttpError(401, "unauthorized", "Please sign in again.");
  }
  // The stored expiry was just extended; send the cookie again so the browser's copy is
  // extended too. Same token: there is no rotation in v1 (backend-design.md §4 says why).
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
  res.json({ accessToken: signAccessToken(userId) });
}

/** POST /api/auth/logout (the cookie) → 204. Works even when already signed out. */
export async function logout(req: Request, res: Response) {
  const token: unknown = req.cookies?.[REFRESH_COOKIE];
  if (typeof token === "string") await deleteRefreshToken(hashToken(token));
  // clearCookie must be given the same path the cookie was set with, or it clears nothing.
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  res.sendStatus(204);
}

/**
 * POST /api/auth/reset-password {token, password} → 204
 *
 * The link came from the admin (`npm run reset-link`). Setting the password signs out
 * every device, and does NOT sign this one in: the student logs in with the new password,
 * which proves it works and keeps this route from being a way to obtain a session.
 */
export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body as z.infer<typeof ResetPasswordBody>;
  // Hashed before the transaction: bcrypt takes a quarter of a second, and a transaction
  // should not hold its row locks while it waits.
  const hashed = await bcrypt.hash(password, 12);
  if (!(await usePasswordReset(hashToken(token), hashed))) {
    throw new HttpError(
      400,
      "reset_link_invalid",
      "This link has expired or was already used. Ask the admin for a new one.",
    );
  }
  res.sendStatus(204);
}
