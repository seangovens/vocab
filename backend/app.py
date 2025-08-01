import os
import sqlite3
from flask import g
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import logging
from datetime import datetime

DATABASE = os.path.join(os.path.dirname(__file__), "vocab.db")
DICTIONARY_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/"

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
CORS(app)


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
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
    data = request.get_json()
    word = data.get("word", "").strip()
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

    return jsonify({
        "word": word,
        "definitions": definitions
    })


@app.route("/add", methods=["POST"])
def add_word():
    db = get_db()
    data = request.get_json()
    word = data.get("word")
    definitions = data.get("definitions", [])

    if not word or not definitions:
        return jsonify({"error": "Missing word or definitions"}), 400

    added_count = 0
    for d in definitions:
        definition = d.get("definition", "")
        example = d.get("example", "")

        try:
            db.execute(
                "INSERT OR IGNORE INTO words (word, definition, example, date_added) VALUES (?, ?, ?, ?)",
                (word, definition, example, datetime.utcnow().isoformat())
            )
            added_count += 1
        except Exception as e:
            print("DB insert error:", e)
            continue

    db.commit()
    return jsonify({"status": "success", "definitions_added": added_count})


@app.route("/words/practice", methods=["GET"])
def get_random_word():
    db = get_db()
    row = db.execute("SELECT * FROM words ORDER BY RANDOM() LIMIT 1").fetchone()
    if row:
        return jsonify(dict(row))
    return jsonify({"error": "No words available"}), 404


@app.route("/practice", methods=["POST"])
def log_practice():
    db = get_db()
    data = request.get_json()
    word_id = data.get("word_id")
    correct = data.get("correct")

    if word_id is None or correct is None:
        return jsonify({"error": "Missing word_id or correct"}), 400

    now = datetime.utcnow().isoformat()

    # First try to update existing row
    update_query = """
        UPDATE practice_logs
        SET last_seen = ?,
            correct = correct + ?,
            incorrect = incorrect + ?
        WHERE word_id = ?
    """
    result = db.execute(update_query, (
        now,
        int(correct),
        int(not correct),
        word_id
    ))

    # If no rows were updated (first attempt), insert a new row
    if result.rowcount == 0:
        insert_query = """
            INSERT INTO practice_logs (word_id, last_seen, correct, incorrect)
            VALUES (?, ?, ?, ?)
        """
        db.execute(insert_query, (
            word_id,
            now,
            int(correct),
            int(not correct)
        ))

    db.commit()
    return jsonify({"status": "logged"})
