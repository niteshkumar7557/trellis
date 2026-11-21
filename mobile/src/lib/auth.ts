// Signing in and out on the phone (docs/mobile.md §4). Every way in ends the same: the API
// answers {accessToken, refreshToken, student}; the refresh token goes to secure storage,
// the access token to memory.

import type { Student } from "@shared/types";
import { api, refreshAccessToken, setAccessToken } from "./api";
import { session } from "./session";

interface SignedIn {
  accessToken: string;
  refreshToken: string;
  student: Student;
}

async function keep(answer: SignedIn): Promise<Student> {
  await session.set(answer.refreshToken);
  setAccessToken(answer.accessToken);
  return answer.student;
}

/** Email and password: "login" for an account, "register" for a new one. */
export async function signIn(kind: "login" | "register", body: { email: string; password: string; name?: string }): Promise<Student> {
  return keep(await api<SignedIn>(`/auth/${kind}`, { method: "POST", body }));
}

/** The last step of Google sign-in: the one-time code from trellis://auth, plus our verifier. */
export async function exchangeGoogleCode(code: string, verifier: string): Promise<Student> {
  return keep(await api<SignedIn>("/auth/desktop/exchange", { method: "POST", body: { code, verifier } }));
}

/**
 * At start: is there a session? "offline" is its own answer, so the app can show "Can't
 * reach Trellis" with Retry instead of sending a signed-in student to Log in.
 */
export async function restoreSession(): Promise<"signed-in" | "signed-out" | "offline"> {
  if (!(await session.get())) return "signed-out";
  const result = await refreshAccessToken();
  return result === "ok" ? "signed-in" : result === "offline" ? "offline" : "signed-out";
}

/**
 * Log out: ask the server to delete the token (so it stops working everywhere), then forget
 * it here. The phone forgets it even if the server can't be reached: the student asked to
 * be signed out of THIS phone, and that must happen.
 */
export async function signOut(): Promise<void> {
  const refreshToken = await session.get();
  if (refreshToken) await api("/auth/logout", { method: "POST", body: { refreshToken } }).catch(() => undefined);
  await session.clear();
  setAccessToken(null);
}
