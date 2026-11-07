-- messages references conversations through a foreign key, so we must drop messages first
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;