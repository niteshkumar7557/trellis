// The two calls to Google that "Sign in with Google" needs, behind two small functions,
// so the rest of the code (and the tests) never touch the library directly.
//
// The flow is the server-side "authorization code" flow (backend-design.md §4):
//   1. googleSignInUrl(state): where to send the browser.
//   2. Google sends the browser back with ?code=…; googleProfile(code) swaps the code for
//      an ID token, VERIFIES it (signature, issuer, expiry, audience = our client id),
//      and returns who it is. The client secret never leaves the server.

import { OAuth2Client } from "google-auth-library";
import config from "../config/index.js";

export const googleEnabled = () => config.google.client_id !== "" && config.google.client_secret !== "";

/** Must match a redirect URI registered on the OAuth client in Google Cloud Console. */
export const GOOGLE_REDIRECT_PATH = "/api/auth/google/callback";

function client() {
  return new OAuth2Client({
    clientId: config.google.client_id,
    clientSecret: config.google.client_secret,
    redirectUri: `${config.public_url}${GOOGLE_REDIRECT_PATH}`,
  });
}

export function googleSignInUrl(state: string): string {
  // openid email profile: who they are, their address, their name. Nothing else: no
  // access to their Google account's data.
  return client().generateAuthUrl({ scope: ["openid", "email", "profile"], state, prompt: "select_account" });
}

export interface GoogleProfile {
  sub: string; // Google's permanent id for the account; an email can change, this can't
  email: string;
  emailVerified: boolean;
  name: string | null;
}

export async function googleProfile(code: string): Promise<GoogleProfile> {
  const c = client();
  const { tokens } = await c.getToken(code);
  if (!tokens.id_token) throw new Error("Google sent no ID token");
  const ticket = await c.verifyIdToken({ idToken: tokens.id_token, audience: config.google.client_id });
  const p = ticket.getPayload();
  if (!p?.sub || !p.email) throw new Error("Google's ID token has no sub or email");
  return { sub: p.sub, email: p.email.toLowerCase(), emailVerified: p.email_verified === true, name: p.name ?? null };
}
