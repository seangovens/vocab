CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    definition TEXT,
    example TEXT,
    part_of_speech TEXT,
    date_added TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(word, definition)
);

CREATE TABLE IF NOT EXISTS practice_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word_id INTEGER REFERENCES words(id),
    last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
    correct INTEGER DEFAULT 0,
    incorrect INTEGER DEFAULT 0
);