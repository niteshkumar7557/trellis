-- Part 3 of every prompt: the reviewed instructions from shared/data/instructions.ts,
-- copied in by the seed. The CHECKs make the database refuse a bad row even if code tries.
CREATE TABLE prompt_instructions (
  id        TEXT PRIMARY KEY,
  scope     TEXT NOT NULL CHECK (scope IN ('base', 'status', 'topic')),
  status    TEXT,
  topic_id  TEXT,
  text      TEXT NOT NULL,
  position  INT  NOT NULL DEFAULT 0,
  CHECK (status IS NULL OR scope = 'status'),
  CHECK (topic_id IS NULL OR scope = 'topic')
);
