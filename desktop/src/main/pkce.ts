// PKCE ("proof key for code exchange", RFC 7636): the secret that makes an intercepted
// sign-in code useless (docs/desktop.md §5). Pure, so it's unit-tested.

import { createHash, randomBytes } from "node:crypto";

/**
 * A fresh verifier: 32 random bytes as base64url, 43 characters (the RFC's minimum length,
 * and 256 bits: unguessable). It never leaves the app's memory except in the final
 * exchange request, straight to our server over HTTPS.
 */
export function makeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/** The challenge sent at the start: base64url(SHA-256(verifier)), the RFC's "S256" method. */
export function challengeOf(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}
