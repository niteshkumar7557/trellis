// Google sign-in on the phone (docs/mobile.md §4): the desktop app's hand-off, reused.
//
//   1. a PKCE verifier stays in this function's memory; its challenge goes in the URL;
//   2. Chrome Custom Tabs opens /api/auth/google?desktop=<challenge>. Custom Tabs is real
//      Chrome running inside our task: Google allows sign-in there (it refuses WebViews),
//      the student's Google session is already in it, and our code can't see what's typed;
//   3. after Google, the site's /auth/desktop page opens trellis://auth?code=…, Android
//      gives that link back to us, and the tab closes;
//   4. the code plus the verifier are swapped for a session, in mobile mode.
//
// openAuthSessionAsync does 2 and 3: it opens the tab and resolves when a link starting
// with "trellis://auth" comes back (or the student closes the tab).

import type { Student } from "@shared/types";
import * as WebBrowser from "expo-web-browser";
import { ApiError } from "./api";
import { exchangeGoogleCode } from "./auth";
import { config } from "./config";
import { challengeOf, newVerifier } from "./pkce";

const RETURN = "trellis://auth";

/** The one-time code from our return link, or null for anything else. The server's codes are 64 lower-case hex. */
export function codeFrom(url: string): string | null {
  const match = /^trellis:\/\/auth\?(?:.*&)?code=([0-9a-f]{64})(?:&|$)/.exec(url);
  return match ? match[1]! : null;
}

/** Null when the student closed the tab: not an error, they changed their mind. */
export async function signInWithGoogle(): Promise<Student | null> {
  const verifier = newVerifier();
  const challenge = await challengeOf(verifier);
  const result = await WebBrowser.openAuthSessionAsync(`${config.apiUrl}/auth/google?desktop=${challenge}`, RETURN);
  if (result.type !== "success") return null;
  const code = codeFrom(result.url);
  if (!code) throw new ApiError(400, "handoff_invalid", "Google sign-in didn't finish. Try again.");
  return exchangeGoogleCode(code, verifier);
}
