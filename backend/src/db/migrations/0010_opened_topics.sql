-- M2.5: big topics the student opened early with "Look inside now" (design.md §6).
-- The other reasons a big topic opens are worked out from the record, so only this one
-- is stored.
CREATE TABLE opened_topics (
  user_id  INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Opening twice is still "open": the key makes the second insert a no-op.
  PRIMARY KEY (user_id, topic_id)
);
