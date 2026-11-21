-- The desktop app's Google sign-in hand-off (docs/desktop.md §5, backend-design.md §4).
--
-- Google signs the student in through their own browser; the callback can't give that
-- browser a session (it's the APP that must be signed in), so it stores a one-time code
-- here and the browser passes the code to the app by a trellis:// link. The app swaps it,
-- with its PKCE verifier, for a session (POST /api/auth/desktop/exchange).
--
-- code_hash: SHA-256 of the code, as for refresh tokens: a database leak gives no code.
-- challenge: base64url(SHA-256(verifier)) from the app; the exchange must prove the
--            verifier, so a code intercepted by another app is useless.
-- used_at:   set by the exchange; a used code never works again.
CREATE TABLE desktop_handoffs (
  code_hash  TEXT PRIMARY KEY,
  user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge  TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ
);
