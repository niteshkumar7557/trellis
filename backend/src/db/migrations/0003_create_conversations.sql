CREATE TABLE conversations(
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);