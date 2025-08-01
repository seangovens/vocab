CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    definition TEXT,
    example TEXT,
    date_added TEXT,
    UNIQUE(word, definition)
);

CREATE TABLE IF NOT EXISTS practice_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word_id INTEGER,
    last_seen TEXT,
    correct INTEGER,
    incorrect INTEGER,
    FOREIGN KEY (word_id) REFERENCES words(id)
);