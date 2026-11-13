-- M3.1: the helper's conversations, one thread per subject (docs/backend-design.md §3).
-- Created now, before the helper (M4), because a proposal points at the message that
-- shows it, and a check-in points at its proposal.
CREATE TABLE chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('student','helper')),
  text       TEXT NOT NULL,
  -- What the reply shows: prompt, choose, suggest, or {type:'confirm', proposalId}. A
  -- confirm card holds only the id; its contents and state live in `proposals`.
  cards      JSONB,
  asks       JSONB,     -- { kind, pending }: a question whose answer the helper is waiting for
  read_by    TEXT CHECK (read_by IN ('tap','model','rules')),   -- student rows: who read it. For debugging
  at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- "The latest 50 messages of this subject" walks this index backwards.
CREATE INDEX chat_messages_user_subject_at ON chat_messages (user_id, subject_id, at);
