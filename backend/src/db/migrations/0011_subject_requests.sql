-- M2.5: what people typed into "Learning something else?" on /start.
CREATE TABLE subject_requests (
  id      BIGSERIAL PRIMARY KEY,
  -- SET NULL, not CASCADE: the request outlives the account, without the name. "Five
  -- people asked for Docker" stays true after one of them leaves.
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  text    VARCHAR(120) NOT NULL,
  at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
