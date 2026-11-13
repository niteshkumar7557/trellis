-- M2.4: what the student said at the sort (docs/backend-design.md §3).
-- History is kept: a new claim is a new row, and the latest per topic counts. Nothing
-- here is a status; statuses are worked out by shared/graph.ts from claims and check-ins.
CREATE TABLE claims (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,                   -- usually a big topic; checked against shared/data
  claim    TEXT NOT NULL CHECK (claim IN ('know','shaky','new')),
  at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- "The latest claim per topic for this student" reads this index in order.
CREATE INDEX claims_user_topic_at ON claims (user_id, topic_id, at DESC);
