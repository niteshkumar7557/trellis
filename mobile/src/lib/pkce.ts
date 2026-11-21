// PKCE, "Proof Key for Code Exchange" (RFC 7636), for Google sign-in (docs/mobile.md §4).
//
// The app makes a random secret, the VERIFIER, and keeps it in memory. It sends only its
// SHA-256, the CHALLENGE, when sign-in starts. The server stores the challenge with the
// one-time code. To swap the code for a session, the app must show the verifier itself.
// Any app on Android can claim the trellis:// scheme; one that caught the link would hold
// the code but not the verifier, so the code would be useless to it.

import * as Crypto from "expo-crypto";

/** base64 → base64url: the URL-safe alphabet, and no "=" padding (RFC 7636 §3). */
export function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 32 random bytes from the phone's secure random source → 43 URL-safe characters. */
export function newVerifier(): string {
  const bytes = Crypto.getRandomBytes(32);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return toBase64Url(btoa(binary));
}

/** base64url(SHA-256(verifier)): what the server stores and later checks the verifier against. */
export async function challengeOf(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 });
  return toBase64Url(digest);
}
