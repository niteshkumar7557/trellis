// Google sign-in through the student's own browser (docs/desktop.md §5).
//
//   startGoogleSignIn()      the window tried to open /api/auth/google: open it in the
//                            browser instead, with our PKCE challenge
//   finishGoogleSignIn(code) a trellis://auth link came back: swap the code and our
//                            verifier for a session in the window's own cookie store
//
// Why not sign in inside the window: Google refuses embedded browsers, and an app that
// owns the window could read the password as it's typed (RFC 8252).

import { session, shell } from "electron";
import { siteOrigin } from "./config";
import { challengeOf, makeVerifier } from "./pkce";
import { showPath } from "./window";

/** Matches the server's 10-minute cookies for the same sign-in. */
const PENDING_MS = 10 * 60 * 1000;

/**
 * The sign-in we started and are waiting on, if any. Only in memory: if the app quits
 * mid-sign-in, the student simply starts again. Only one at a time: starting again
 * replaces it, so only the newest browser tab's link can finish.
 */
let pending: { verifier: string; startedAt: number } | null = null;

export function startGoogleSignIn(): void {
  const verifier = makeVerifier();
  pending = { verifier, startedAt: Date.now() };
  shell.openExternal(`${siteOrigin()}/api/auth/google?desktop=${challengeOf(verifier)}`);
}

export async function finishGoogleSignIn(code: string): Promise<void> {
  // A link we didn't ask for is ignored. Otherwise anyone could send the student a
  // trellis://auth link from THEIR Google account and sign the app in as them ("login
  // CSRF"). PKCE would already stop that (their code is tied to their challenge); this
  // stops it before any request is made.
  if (!pending || Date.now() - pending.startedAt > PENDING_MS) return;
  const { verifier } = pending;
  pending = null; // one try per sign-in, whatever happens next

  let ok = false;
  try {
    // session.defaultSession.fetch is the window's own network stack and cookie store, so
    // the refresh cookie in the answer lands exactly where the window will look for it.
    const res = await session.defaultSession.fetch(`${siteOrigin()}/api/auth/desktop/exchange`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, verifier }),
      credentials: "include",
      signal: AbortSignal.timeout(10_000),
    });
    ok = res.ok;
  } catch {
    ok = false; // offline, timeout: same as a refused code for the student
  }
  // /auth/done is the site's own landing after Google: its start-up refresh turns the
  // new cookie into a signed-in map. On failure, the login page explains (error=google).
  showPath(ok ? "/auth/done" : "/login?error=google");
}
