CREATE TABLE prompt_instructions (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL CHECK (scope IN ('base', 'status', 'topic')),
    status TEXT,
    topic_id TEXT,
    text TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0
);