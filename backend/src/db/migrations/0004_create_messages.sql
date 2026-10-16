CREATE TABLE messages(
    id SERIAL PRIMARY KEY,
    conversation_id INT NOT NULL,
    by_user BOOLEAN NOT NULL DEFAULT TRUE,
    content TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);