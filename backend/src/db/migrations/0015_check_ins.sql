-- M3.1: status changes, always on a subtopic. Statuses are worked out from these by
-- shared/graph.ts; nothing stores a status.
CREATE TABLE check_ins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id    TEXT NOT NULL,
  outcome     TEXT NOT NULL CHECK (outcome IN ('got','partly','stuck')),
  text        TEXT NOT NULL,                -- the student's words, or a short label for a tap
  -- What created it. Undo deletes by this. SET NULL, not CASCADE: if the proposal row
  -- ever goes, the check-in the student saved must stay.
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX check_ins_user_at ON check_ins (user_id, at);
CREATE INDEX check_ins_proposal ON check_ins (proposal_id);
