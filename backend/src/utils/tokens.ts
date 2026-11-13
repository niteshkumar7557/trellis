// The three kinds of secret string the API hands out, and how each is checked.
// Pure functions: no database here. Storing tokens is the repo's job (src/repos/auth.repo.ts).
//
//   access token   a signed JWT, 15 minutes, holds only the user id. Checked by signature,
//                  so a normal request never touches the database.
//   refresh token  a random string in a cookie, 60 days from last use. Checked by looking
//                  up its hash in refresh_tokens, so logging out kills it at once.
//   reset token    a random string in a one-time link, one hour. Same idea as a refresh
//                  token, in password_resets.

import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import config from "../config/index.js";

/**
 * The token holds only `sub` (the user id, as a string: the JWT standard says `sub` is one).
 * A name or email inside it would go stale when edited, and anyone holding the token can
 * read it: a JWT is signed, not encrypted.
 */
export function signAccessToken(userId: number): string {
  return jwt.sign({}, config.jwt_secret, {
    subject: String(userId),
    // jsonwebtoken types this as a template-literal type ("15m"); the config holds a
    // plain string that has been read from the environment, hence the cast.
    expiresIn: config.access_token_ttl as jwt.SignOptions["expiresIn"],
    // Only HS256 is ever used. Naming it here and in verify() blocks the classic trick of
    // a token that claims a different algorithm.
    algorithm: "HS256",
  });
}

/** The user id inside a valid, unexpired access token, or null for anything else. */
export function verifyAccessToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, config.jwt_secret, { algorithms: ["HS256"] });
    if (typeof payload === "string" || typeof payload.sub !== "string") return null;
    const id = Number(payload.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    // Expired, wrong signature, malformed: the caller only needs "no".
    return null;
  }
}

/** 32 random bytes as hex: 256 bits, far beyond guessing. Used for refresh and reset tokens. */
export function newRandomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * What the database stores instead of the token. SHA-256, not bcrypt: these are long random
 * strings, not human passwords, so there is nothing to brute-force, and a fast hash lets us
 * find a token by its hash with one indexed lookup.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
