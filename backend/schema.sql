CREATE TABLE IF NOT EXISTS words (
    id SERIAL PRIMARY KEY,
    word TEXT NOT NULL,
    definition TEXT,
    example TEXT,
    date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(word, definition)
);

CREATE TABLE IF NOT EXISTS practice_logs (
    id SERIAL PRIMARY KEY,
    word_id INTEGER REFERENCES words(id),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    correct INTEGER DEFAULT 0,
    incorrect INTEGER DEFAULT 0
);