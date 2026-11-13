-- M3.3: a prompt was copied or opened in an AI (docs/backend-design.md §3). This is what
-- lets the helper ask "how did State go?" when the student comes back. It replaces the
-- old plan of counting uses on each experience.
CREATE TABLE prompt_takes (
  id       BIGSERIAL PRIMARY KEY,
  user_id  INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  via      TEXT NOT NULL CHECK (via IN ('copy','chatgpt','claude')),
  at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- GET /api/state reads "the latest 20" through this index.
CREATE INDEX prompt_takes_user_at ON prompt_takes (user_id, at DESC);
