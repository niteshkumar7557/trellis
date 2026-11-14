-- AI limits per account (docs/backend-design.md §5 "Cost limits").
--
-- Until now a model call left its ai_calls row AFTER the call, and the budget was checked
-- BEFORE it, with nothing in between. That let two things slip past the money count:
--   1. several messages sent at the same moment all passed the check before any was counted;
--   2. a call that timed out was written with no cost at all, though Bedrock may have
--      billed it.
--
-- So a call is now RESERVED first: its row is inserted before the call, holding the most
-- this call can cost (reserved_usd), and the limits count that amount at once. When the
-- call returns, the row is SETTLED: cost_usd gets what it really cost.
--
-- What a limit counts for any row is therefore
--     COALESCE(cost_usd, reserved_usd, 0)
--   * settled row:            cost_usd (the real cost; the reservation for a timeout)
--   * still pending, or the server died mid-call: reserved_usd (the worst case)
--   * a row from before this migration with no cost: 0, as it counted before
-- Every failure errs towards counting too much, never too little.
ALTER TABLE ai_calls ADD COLUMN reserved_usd NUMERIC(10,6);

-- "What has THIS account spent today and this week" reads a range of this index. The
-- existing ai_calls_at index still serves the whole site's daily total.
CREATE INDEX ai_calls_user_at ON ai_calls (user_id, at);
