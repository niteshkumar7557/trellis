-- M3.2: what the student said about how a topic went (docs/backend-design.md §3).
-- There is no `uses` counter: whether a "hard" note goes in a prompt depends on its
-- topic's status (§6), so the prompt is a pure function of the record.
CREATE TABLE experiences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id    TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('easy','hard','clicked')),
  text        TEXT NOT NULL,                -- their exact words
  line        TEXT NOT NULL,                -- a clean one-line version for prompts
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX experiences_user_topic ON experiences (user_id, topic_id);
CREATE INDEX experiences_proposal ON experiences (proposal_id);
