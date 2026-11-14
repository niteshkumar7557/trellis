-- M5.1: every call to the model (docs/backend-design.md §3 and §5). Three jobs:
--   1. the daily AI budget is counted from cost_usd, so a restart can't reset it;
--   2. what the helper costs, per day, without opening the AWS bill;
--   3. debugging: how often calls time out, are refused, or come back unusable.
-- It holds numbers only, NEVER the student's message or the model's reply: those would
-- be a second copy of private words, outside the record the student can see and delete.
CREATE TABLE ai_calls (
  id            BIGSERIAL PRIMARY KEY,
  -- SET NULL, not CASCADE: when a student deletes their account the spend still happened,
  -- and today's budget must still count it. A warm-up call has no student at all.
  user_id       INT REFERENCES users(id) ON DELETE SET NULL,
  model         TEXT NOT NULL,              -- 'zai.glm-5'
  -- 'read': a student's typed message. 'warmup': the server's own call that keeps the
  -- schema compiled on Bedrock's side (src/ai/reader.ts warmUp).
  purpose       TEXT NOT NULL CHECK (purpose IN ('read','warmup')),
  input_tokens  INT,                        -- NULL when the call failed before Bedrock counted
  output_tokens INT,
  cost_usd      NUMERIC(10,6),              -- from the token counts and the configured prices
  latency_ms    INT NOT NULL,
  ok            BOOLEAN NOT NULL,
  error         TEXT,                       -- a short code: 'timeout', 'throttled', 'bad_output', ...
  at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- "What was spent since midnight UTC" reads a range of this index.
CREATE INDEX ai_calls_at ON ai_calls (at);
