// A real signed access token, for testing routes behind requireAuth. Not a test file itself.
//
// The secret matches `env.JWT_SECRET` in vitest.config.ts and vitest.integration.config.ts,
// which Vitest sets before any file is imported, so the server under test accepts it.

import jwt from "jsonwebtoken";

export const TEST_JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";

/** `Authorization` header value for this user id, shaped like the server's own tokens. */
export function bearerToken(userId = 1) {
  return `Bearer ${jwt.sign({}, TEST_JWT_SECRET, { subject: String(userId), expiresIn: "5m" })}`;
}
