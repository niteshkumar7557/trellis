-- M2.1: accounts that can sign in with Google, hashed refresh tokens, one-time reset links.
-- The reasons are in docs/backend-design.md §3 "Accounts".

-- Google-only accounts have no password, so the column must allow NULL.
ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;

-- Google's permanent id for the account. One column, because there is one provider.
ALTER TABLE users ADD COLUMN google_sub TEXT UNIQUE;

-- NULL until something proves the person owns the address (Google today, an emailed code
-- later). The Google linking rule depends on it (backend-design.md §4).
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;

-- Emails are compared in lower case everywhere. The code lower-cases before every lookup
-- and insert; this fixes any row written before that rule existed.
UPDATE users SET email = lower(email);

-- Refresh tokens were stored as plain text. From now on only a SHA-256 hash is stored, so
-- a copy of the database cannot be used to log in as anyone. A hash cannot be turned back
-- into the token the browser holds, so old rows cannot be converted: everyone logs in once
-- more.
DELETE FROM refresh_tokens;
ALTER TABLE refresh_tokens RENAME COLUMN token TO token_hash;
ALTER INDEX idx_refresh_tokens_token RENAME TO idx_refresh_tokens_token_hash;
ALTER TABLE refresh_tokens ALTER COLUMN expires_at TYPE TIMESTAMPTZ;
ALTER TABLE refresh_tokens ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- One-time reset links. Made by the admin script (`npm run reset-link`) today; by an
-- emailed code later.
CREATE TABLE password_resets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,          -- the link holds the token; we keep its hash
  expires_at TIMESTAMPTZ NOT NULL,          -- one hour after it is made
  used_at    TIMESTAMPTZ,                   -- set once; a used link never works again
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);
