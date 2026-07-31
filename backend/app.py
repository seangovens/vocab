import logging
import os
import sqlite3
from datetime import datetime, timedelta, timezone

import requests
from flask import Flask, g, jsonify, request
from flask_cors import CORS

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv():
        return False


load_dotenv()

DICTIONARY_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/"

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
CORS(app)


def _get_request_token() -> str:
    token = request.headers.get("X-Api-Key")
    if token:
        return token.strip()

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[len("Bearer ") :].strip()

    return ""


@app.before_request
def require_api_token():
    if request.path in ("/", "/health") or request.method == "OPTIONS":
        return

    expected_token = os.environ.get("API_TOKEN")
    if not expected_token:
        logging.error("API_TOKEN is not configured. All requests will be rejected.")
        return jsonify({"error": "server misconfigured"}), 500

    supplied_token = _get_request_token()
    if supplied_token != expected_token:
        return jsonify({"error": "unauthorized"}), 401


def get_db_path():
    database_url = os.environ.get("DATABASE_URL", "sqlite:///vocab.db")
    if database_url.startswith("sqlite://"):
        if database_url.startswith("sqlite:///"):
            path = database_url[len("sqlite:///") :]
            if not path:
                return os.path.join(os.path.dirname(__file__), "vocab.db")
            if os.path.isabs(path):
                return path
            return os.path.join(os.path.dirname(__file__), path)

        relative_path = database_url[len("sqlite://") :]
        if relative_path.startswith("/"):
            return relative_path[1:]
        return os.path.join(os.path.dirname(__file__), relative_path)

    return database_url


def get_db():
    if "db" not in g:
        db_path = get_db_path()
        db_dir = os.path.dirname(db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        g.db = conn
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    with open(os.path.join(os.path.dirname(__file__), "schema.sql"), "r", encoding="utf-8") as schema_file:
        db.executescript(schema_file.read())
    db.commit()


with app.app_context():
    init_db()


@app.route("/")
def home():
    return "Vocab lookup"


@app.route("/lookup", methods=["POST"])
def lookup():
    db = get_db()
    data = request.get_json(silent=True) or {}
    word = (data.get("word") or "").strip().lower()
    logging.debug(word)

    if not word:
        return jsonify({"error": "No word provided"}), 400

    try:
        response = requests.get(DICTIONARY_URL + word, timeout=10)
    except requests.RequestException:
        return jsonify({"error": "Dictionary service unavailable"}), 502

    if response.status_code != 200:
        return jsonify({"error": "Word not found"}), 404

    result = response.json()
    definitions = []

    try:
        for meaning in result[0]["meanings"]:
            for definition in meaning["definitions"]:
                definitions.append({
                    "definition": definition["definition"],
                    "example": definition.get("example"),
                })
    except (KeyError, IndexError, TypeError):
        return jsonify({"error": "Unexpected response format"}), 500

    cur = db.cursor()
    cur.execute("SELECT definition FROM words WHERE word = ?", (word,))
    saved_rows = cur.fetchall()
    saved_defs = [row["definition"] for row in saved_rows]

    return jsonify({
        "word": word,
        "definitions": definitions,
        "savedDefinitions": saved_defs,
    })


@app.route("/add", methods=["POST"])
def add_word():
    db = get_db()
    data = request.get_json(silent=True) or {}
    word = (data.get("word") or "").strip().lower()
    definitions = data.get("definitions", [])

    if not word or not definitions:
        return jsonify({"error": "Missing word or definitions"}), 400

    cur = db.cursor()
    cur.execute("DELETE FROM words WHERE word = ?", (word,))

    added_count = 0
    for definition_entry in definitions:
        definition = definition_entry.get("definition", "")
        example = definition_entry.get("example", "")

        try:
            cur.execute(
                "INSERT INTO words (word, definition, example, date_added) VALUES (?, ?, ?, ?)",
                (word, definition, example, datetime.now(timezone.utc).isoformat()),
            )
            added_count += 1
        except sqlite3.Error as exc:
            logging.warning("DB insert error: %s", exc)
            continue

    db.commit()
    return jsonify({"status": "success", "definitions_added": added_count})


@app.route("/getrandom", methods=["GET"])
def get_random_choices():
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        SELECT id, word, definition, example, date_added
        FROM (
            SELECT
                id,
                word,
                definition,
                example,
                date_added,
                ROW_NUMBER() OVER (PARTITION BY word ORDER BY RANDOM()) AS rn
            FROM words
        )
        WHERE rn = 1
        ORDER BY RANDOM()
        LIMIT 8
    """)
    rows = [dict(row) for row in cur.fetchall()]
    if rows:
        return jsonify(rows)
    return jsonify({"error": "No words available"}), 404


@app.route("/practice", methods=["POST"])
def log_practice():
    db = get_db()
    data = request.get_json(silent=True) or {}
    word_id = data.get("word_id")
    correct = data.get("correct")

    if word_id is None or correct is None:
        return jsonify({"error": "Missing word_id or correct"}), 400

    now = datetime.now(timezone.utc).isoformat()
    is_correct = int(bool(correct))

    cur = db.cursor()
    cur.execute(
        """
        UPDATE practice_logs
        SET last_seen = ?,
            correct = correct + ?,
            incorrect = incorrect + ?
        WHERE word_id = ?
        """,
        (now, is_correct, 1 - is_correct, word_id),
    )

    if cur.rowcount == 0:
        cur.execute(
            """
            INSERT INTO practice_logs (word_id, last_seen, correct, incorrect)
            VALUES (?, ?, ?, ?)
            """,
            (word_id, now, is_correct, 1 - is_correct),
        )

    db.commit()
    return jsonify({"status": "logged"})


@app.route("/stats", methods=["GET"])
def get_stats():
    db = get_db()

    cur = db.cursor()
    cur.execute("""
        SELECT word, SUM(COALESCE(incorrect, 0)) as incorrect, SUM(COALESCE(correct, 0)) as correct
        FROM practice_logs
        JOIN words ON practice_logs.word_id = words.id
        GROUP BY word
        ORDER BY (SUM(COALESCE(incorrect, 0)) + SUM(COALESCE(correct, 0))) DESC
    """)
    practice_stats_rows = cur.fetchall()
    practice_stats = [
        {
            "word": row["word"],
            "incorrect": row["incorrect"],
            "correct": row["correct"],
        }
        for row in practice_stats_rows
    ]

    cur.execute("SELECT COUNT(DISTINCT word) AS count FROM words")
    word_count_row = cur.fetchone()
    word_count = word_count_row["count"] if word_count_row else 0

    cur.execute("SELECT DISTINCT date(date_added) AS day FROM words WHERE date_added IS NOT NULL ORDER BY day DESC")
    day_rows = cur.fetchall()
    days = {row["day"] for row in day_rows}

    streak = 0
    today = datetime.now(timezone.utc).date()
    current_day = today
    while current_day.strftime("%Y-%m-%d") in days:
        streak += 1
        current_day -= timedelta(days=1)

    cur.execute("SELECT word FROM words ORDER BY date_added DESC LIMIT 1")
    most_recent = cur.fetchone()
    most_recent_word = most_recent["word"] if most_recent else None

    return jsonify({
        "practiceStats": practice_stats,
        "summary": {
            "streak": streak,
            "wordCount": word_count,
            "mostRecent": most_recent_word,
        },
    })
