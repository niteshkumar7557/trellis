-- M3.1: a change the helper offers. NOTHING is written to the record until its state
-- becomes 'saved' (docs/backend-design.md §3 says why this is a table, not JSON).
CREATE TABLE proposals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,  -- the helper message showing the card
  state      TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open','saved','cancelled','undone')),
  payload    JSONB NOT NULL,                -- the Proposal: { updates, experiences, said }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);
-- The database itself guarantees at most one open proposal per student and subject.
CREATE UNIQUE INDEX proposals_one_open ON proposals (user_id, subject_id) WHERE state = 'open';
