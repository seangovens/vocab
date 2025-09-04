import os
import psycopg2
import psycopg2.extras
from flask import g
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import logging
from datetime import datetime
from datetime import timezone

from dotenv import load_dotenv
load_dotenv()

DICTIONARY_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/"

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
CORS(app)


def get_db():
    if "db" not in g:
        g.db = psycopg2.connect(
            os.environ["DATABASE_URL"],
            cursor_factory=psycopg2.extras.RealDictCursor
        )
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()


@app.route("/")
def home():
    return "Vocab lookup"


@app.route("/lookup", methods=["POST"])
def lookup():
    db = get_db()
    data = request.get_json()
    word = data.get("word", "").strip().lower()
    logging.debug(word)

    if not word:
        return jsonify({"error": "No word provided"}), 400

    response = requests.get(DICTIONARY_URL + word)

    if response.status_code != 200:
        return jsonify({"error": "Word not found"}), 404

    result = response.json()
    definitions = []

    try:
        for meaning in result[0]["meanings"]:
            for definition in meaning["definitions"]:
                definitions.append({
                    "definition": definition["definition"],
                    "example": definition.get("example")
                })
    except (KeyError, IndexError, TypeError):
        return jsonify({"error": "Unexpected response format"}), 500

    cur = db.cursor()
    cur.execute(
        "SELECT definition FROM words WHERE word = %s", (word,)
    )
    saved_rows = cur.fetchall()
    saved_defs = [d["definition"] for d in saved_rows]

    print("Saved definitions:", saved_defs)

    return jsonify({
        "word": word,
        "definitions": definitions,
        "savedDefinitions": saved_defs
    })


@app.route("/add", methods=["POST"])
def add_word():
    db = get_db()
    data = request.get_json()
    word = data.get("word").strip().lower()
    definitions = data.get("definitions", [])

    if not word or not definitions:
        return jsonify({"error": "Missing word or definitions"}), 400

    cur = db.cursor()
    # Remove existing definitions if they exist
    cur.execute(
        "DELETE FROM words WHERE word = %s",
        (word,)
    )

    added_count = 0
    for d in definitions:
        definition = d.get("definition", "")
        example = d.get("example", "")

        try:
            cur.execute(
                "INSERT INTO words (word, definition, example, date_added) VALUES (%s, %s, %s, %s)",
                (word, definition, example, datetime.now(timezone.utc).isoformat())
            )
            added_count += 1
        except Exception as e:
            print("DB insert error:", e)
            continue

    db.commit()
    return jsonify({"status": "success", "definitions_added": added_count})


@app.route("/getrandom", methods=["GET"])
def get_random_choices():
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        WITH random_definitions AS (
            SELECT DISTINCT ON (w.word)
                w.id,
                w.word,
                w.definition,
                w.example,
                w.date_added
            FROM words w
            ORDER BY w.word, RANDOM()
        ),
        random_words AS (
            SELECT *
            FROM random_definitions
            ORDER BY RANDOM()
            LIMIT 8
        )
        SELECT *
        FROM random_words;
    """)
    rows = cur.fetchall()
    if rows:
        return jsonify(rows)
    return jsonify({"error": "No words available"}), 404


@app.route("/practice", methods=["POST"])
def log_practice():
    db = get_db()
    data = request.get_json()
    word_id = data.get("word_id")
    correct = data.get("correct")

    if word_id is None or correct is None:
        return jsonify({"error": "Missing word_id or correct"}), 400

    now = datetime.now(timezone.utc).isoformat()

    cur = db.cursor()
    # First try to update existing row
    cur.execute("""
        UPDATE practice_logs
        SET last_seen = %s,
            correct = correct + %s,
            incorrect = incorrect + %s
        WHERE word_id = %s
    """, (now, int(correct), int(not correct), word_id))

    # If no rows were updated (first attempt), insert a new row
    if cur.rowcount == 0:
        cur.execute("""
            INSERT INTO practice_logs (word_id, last_seen, correct, incorrect)
            VALUES (%s, %s, %s, %s)
        """, (word_id, now, int(correct), int(not correct)))

    db.commit()
    return jsonify({"status": "logged"})


@app.route("/stats", methods=["GET"])
def get_stats():
    db = get_db()

    cur = db.cursor()
    cur.execute("""
        SELECT word, SUM(incorrect) as incorrect, SUM(correct) as correct
        FROM practice_logs JOIN words ON practice_logs.word_id = words.id
        GROUP BY word
        ORDER BY (SUM(incorrect) + SUM(correct)) DESC
    """)
    practice_stats_rows = cur.fetchall()
    practice_stats = [
        {
            "word": d["word"],
            "incorrect": d["incorrect"],
            "correct": d["correct"]
        } for d in practice_stats_rows]

    print("Here are practice stats:")
    print(practice_stats)

    # Get total word count
    cur.execute("SELECT COUNT(DISTINCT word) FROM words")
    word_count = cur.fetchone()["count"]

    print("Here is the word count:")
    print(word_count)

    # Get streak
    cur.execute("""
        WITH days AS (
            SELECT DISTINCT date(date_added AT TIME ZONE 'UTC') AS day
            FROM words
            WHERE date_added >= NOW() - INTERVAL '30 days'
        ),
        numbered AS (
            SELECT
                day,
                ROW_NUMBER() OVER (ORDER BY day DESC) AS rn
            FROM days
        ),
        streaks AS (
            SELECT
                MIN(day) AS streak_start,
                MAX(day) AS streak_end,
                COUNT(*) AS streak_length
            FROM (
                SELECT
                    day,
                    rn,
                    day - (rn || ' days')::interval AS grp
                FROM numbered
            ) sub
            GROUP BY grp
        )
        SELECT streak_length
        FROM streaks
        WHERE streak_end = CURRENT_DATE
        ORDER BY streak_length DESC
        LIMIT 1
    """)
    streak_row = cur.fetchone()
    streak = 0
    if streak_row and "streak_length" in streak_row:
        streak = streak_row["streak_length"]

    print("Here is the streak:")
    print(streak)

    # Get most recent word added
    cur.execute("SELECT word FROM words ORDER BY date_added DESC LIMIT 1")
    most_recent = cur.fetchone()
    most_recent_word = most_recent["word"] if most_recent else None

    return jsonify({
        "practiceStats": practice_stats,
        "summary": {
            "streak": streak,
            "wordCount": word_count,
            "mostRecent": most_recent_word
        }
    })
