-- M2.3: the student's goal, one per subject (docs/backend-design.md §3).
-- subject_id and goal_id are plain TEXT, checked in code against shared/data: the subjects
-- and goals live in files (and Neo4j), not in Postgres, so they cannot be foreign keys.
CREATE TABLE student_goals (
  user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,                 -- 'react-native' | 'redis'
  goal_id    TEXT NOT NULL,                 -- e.g. 'goal-rn-first-app'
  since      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- The primary key IS the "one goal per subject" rule: a second row can't exist.
  PRIMARY KEY (user_id, subject_id)
);
