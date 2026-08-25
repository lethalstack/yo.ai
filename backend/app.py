from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from dotenv import load_dotenv
from groq import Groq
from openai import OpenAI as OpenRouterClient
from pypdf import PdfReader
import base64
import io
import os
import sqlite3
import time
import libsql_client

load_dotenv(".env")


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, methods=["GET", "POST", "DELETE", "PATCH", "OPTIONS"])


# ── Clients ──
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

or_client = OpenRouterClient(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
    default_headers={"HTTP-Referer": "http://localhost:5173"}
)

# ── Models ──
TEXT_MODEL = "openai/gpt-oss-120b"
OR_VISION_MODEL = "google/gemini-2.0-flash-exp:free"

MAX_EXTRACTED_CHARS = 6000

# ── Prompts ──
PLAIN_TEXT_INSTRUCTION = (
    " Always respond in plain natural conversational text only. "
    "Never wrap your answer in JSON, a code block, or any structured "
    "format — just write the reply directly, unless the user explicitly "
    "asks for code or JSON output."
)

EMOJI_INSTRUCTION = (
    " For longer or more detailed explanations, use relevant emojis "
    "naturally to break up sections, highlight key points, and make the "
    "response feel warmer and easier to skim — a few well-placed emojis, "
    "not excessive or forced. Short, simple replies don't need them."
)

MODE_PROMPTS = {
    "chill": (
        "You are yo in Chill Mode. Explain concepts like a smart, "
        "relaxed friend — casual tone, real talk, never robotic. "
        "Keep it conversational and easy to follow."
        + PLAIN_TEXT_INSTRUCTION
        + EMOJI_INSTRUCTION
    ),
    "exam": (
        "You are yo in Exam Mode. Focus on the most important points, "
        "clear summaries, and revision-friendly structure built for "
        "retention. Prioritize what's likely to be tested. Use bullet "
        "points and bolded key terms where helpful."
        + PLAIN_TEXT_INSTRUCTION
        + EMOJI_INSTRUCTION
    ),
    "coding": (
        "You are yo in Coding Mode. Help debug code, teach programming "
        "concepts clearly, and improve how the user solves problems. "
        "Use code blocks for any code. Explain the 'why' behind fixes, "
        "not just the fix itself."
        + PLAIN_TEXT_INSTRUCTION
        + EMOJI_INSTRUCTION
    ),
    "interview": (
        "You are yo in Interview Mode. Practice interviews with the "
        "user using realistic prompts and give clear, structured feedback "
        "— what was strong, what to improve, and how to phrase it better "
        "next time."
        + PLAIN_TEXT_INSTRUCTION
        + EMOJI_INSTRUCTION
    ),
}
DEFAULT_MODE = "chill"

# ── Database ──
TURSO_DB_URL = os.getenv("TURSO_DB_URL")
TURSO_DB_TOKEN = os.getenv("TURSO_DB_TOKEN")
USE_TURSO = bool(TURSO_DB_URL)

DB_PATH = "chat.db"  # only used for local dev, when Turso env vars aren't set


class LibsqlCursor:
    """Wraps a libsql_client result to behave like a sqlite3 cursor."""
    def __init__(self, client):
        self._client = client
        self._result = None

    def execute(self, sql, params=None):
        self._result = self._client.execute(sql, list(params) if params else [])
        return self

    def fetchone(self):
        if not self._result.rows:
            return None
        return dict(zip(self._result.columns, self._result.rows[0]))

    def fetchall(self):
        return [dict(zip(self._result.columns, r)) for r in self._result.rows]

    @property
    def lastrowid(self):
        if self._result.rows:
            return self._result.rows[0][0]
        return None


class LibsqlConn:
    """Wraps a libsql_client client to behave like a sqlite3 connection."""
    def __init__(self):
        self._client = libsql_client.create_client_sync(
            url=TURSO_DB_URL, auth_token=TURSO_DB_TOKEN
        )

    def cursor(self):
        return LibsqlCursor(self._client)

    def execute(self, sql, params=None):
        return self.cursor().execute(sql, params)

    def commit(self):
        pass  # each statement auto-commits over the Turso HTTP protocol

    def close(self):
        self._client.close()


def get_db():
    if USE_TURSO:
        return LibsqlConn()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT 'New Chat',
        mode TEXT NOT NULL DEFAULT 'chill',
        is_pinned INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        user_message TEXT,
        ai_reply TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (chat_id) REFERENCES chats(id)
    )
    """)

    conn.commit()
    conn.close()


init_db()

try:
    _c = get_db()
    _c.execute("ALTER TABLE chats ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0")
    _c.commit()
    _c.close()
except Exception:
    pass


# ── Helpers ──
def trim_conversation(conversation, max_tokens=5500):
    """Keep system prompt + as many recent messages as fit.
    5500 tokens leaves ~2500 for the response within 8000 TPM."""
    system = conversation[0] if conversation and conversation[0]["role"] == "system" else None
    messages = conversation[1:] if system else conversation

    max_chars = max_tokens * 3
    total_chars = 0
    kept = []

    for msg in reversed(messages):
        content = msg["content"]
        if isinstance(content, list):
            chars = sum(len(p.get("text", "")) for p in content if p.get("type") == "text")
            imgs = sum(1 for p in content if p.get("type") == "image_url")
            chars += imgs * 4000
        else:
            chars = len(content)

        if total_chars + chars > max_chars:
            break
        total_chars += chars
        kept.append(msg)

    kept.reverse()
    return [system] + kept if system else kept


def generate_title(first_message):
    try:
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Generate a short 2-4 word title (no quotes, no punctuation "
                        "at the end) summarizing the topic of this message. "
                        "Reply with ONLY the title, nothing else.\n\n"
                        f"Message: {first_message}"
                    )
                }
            ]
        )
        title = response.choices[0].message.content.strip().strip('"').strip("'")
        if len(title) > 60 or len(title) == 0:
            raise ValueError("bad title")
        return title
    except Exception as e:
        print("Title generation failed, falling back:", e)
        fallback = first_message.strip()
        return (fallback[:40] + "…") if len(fallback) > 40 else fallback


def extract_text_from_file(file_storage):
    filename = (file_storage.filename or "").lower()
    try:
        if filename.endswith(".pdf"):
            reader = PdfReader(file_storage.stream)
            pages_text = []
            for page in reader.pages:
                pages_text.append(page.extract_text() or "")
            return "\n".join(pages_text).strip()

        if filename.endswith(".txt"):
            raw = file_storage.stream.read()
            return raw.decode("utf-8", errors="ignore").strip()

    except Exception as e:
        print(f"Failed to extract text from {filename}:", repr(e))
        return None

    return None


def save_message(chat_id, stored_user_message, accumulated, is_new_chat):
    """Persist the completed message pair to the database."""
    try:
        write_conn = get_db()
        write_cursor = write_conn.cursor()
        write_cursor.execute(
            "INSERT INTO messages (chat_id, user_message, ai_reply) VALUES (?, ?, ?)",
            (chat_id, stored_user_message, accumulated)
        )
        if is_new_chat:
            new_title = generate_title(stored_user_message)
            write_cursor.execute("UPDATE chats SET title = ? WHERE id = ?", (new_title, chat_id))
        write_conn.commit()
        write_conn.close()
    except Exception as e:
        print("Failed to persist message:", repr(e))


# ── Routes ──
@app.route("/api/new-chat", methods=["POST"])
def new_chat():
    data = request.get_json(silent=True) or {}
    mode = data.get("mode")
    if mode not in MODE_PROMPTS:
        mode = DEFAULT_MODE

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO chats (title, mode) VALUES (?, ?) RETURNING id", ("New Chat", mode))
    chat_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"chat_id": chat_id})


@app.route("/api/chats", methods=["GET"])
def get_chats():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, mode, is_pinned FROM chats
        ORDER BY
            (SELECT MAX(created_at) FROM messages WHERE messages.chat_id = chats.id) DESC,
            id DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    chats = [{"id": row["id"], "title": row["title"], "mode": row["mode"], "is_pinned": bool(row["is_pinned"])} for row in rows]
    return jsonify(chats)


@app.route("/api/chats/<int:chat_id>", methods=["PATCH"])
def update_chat(chat_id):
    try:
        data = request.get_json(silent=True) or {}
        if not data:
            return jsonify({"error": "no data provided"}), 400

        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM chats WHERE id = ?", (chat_id,))
        if cursor.fetchone() is None:
            conn.close()
            return jsonify({"error": "chat not found"}), 404

        updates = []
        params = []

        if "title" in data:
            updates.append("title = ?")
            params.append(str(data["title"])[:200])

        if "is_pinned" in data:
            updates.append("is_pinned = ?")
            params.append(1 if data["is_pinned"] else 0)

        if not updates:
            conn.close()
            return jsonify({"error": "nothing to update"}), 400

        params.append(chat_id)
        cursor.execute(f"UPDATE chats SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

        cursor.execute("SELECT id, title, mode, is_pinned FROM chats WHERE id = ?", (chat_id,))
        row = cursor.fetchone()
        conn.close()

        return jsonify({
            "id": row["id"],
            "title": row["title"],
            "mode": row["mode"],
            "is_pinned": bool(row["is_pinned"])
        })

    except Exception as e:
        print("update_chat failed:", repr(e))
        return jsonify({"error": str(e)}), 500


@app.route("/api/chat/<int:chat_id>", methods=["GET"])
def get_chat_messages(chat_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT title, mode FROM chats WHERE id = ?", (chat_id,))
        chat_row = cursor.fetchone()

        if chat_row is None:
            conn.close()
            return jsonify({"error": "chat not found"}), 404

        cursor.execute(
            "SELECT user_message, ai_reply FROM messages WHERE chat_id = ? ORDER BY id ASC",
            (chat_id,)
        )
        rows = cursor.fetchall()
        conn.close()

        messages = [
            {"user": row["user_message"], "ai": row["ai_reply"]}
            for row in rows
        ]

        return jsonify({
            "title": chat_row["title"],
            "mode": chat_row["mode"],
            "messages": messages
        })

    except Exception as e:
        print("get_chat_messages failed:", repr(e))
        return jsonify({"error": str(e)}), 500


@app.route("/api/chat/<int:chat_id>", methods=["DELETE"])
def delete_chat(chat_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE chat_id = ?", (chat_id,))
        cursor.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
        conn.commit()
        conn.close()
        return jsonify({"deleted": chat_id})

    except Exception as e:
        print("delete_chat failed:", repr(e))
        return jsonify({"error": str(e)}), 500


@app.route("/api/chat", methods=["POST"])
def chat():
    user_message = (request.form.get("message") or "").strip()
    chat_id = request.form.get("chat_id")
    uploaded_files = request.files.getlist("files")

    if not user_message and not uploaded_files:
        return jsonify({"error": "message or a file is required"}), 400

    if not chat_id:
        return jsonify({"error": "chat_id is required"}), 400

    # ── DB lookup ──
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id, title, mode FROM chats WHERE id = ?", (chat_id,))
    chat_row = cursor.fetchone()

    if chat_row is None:
        conn.close()
        return jsonify({"error": "chat not found"}), 404

    cursor.execute(
        "SELECT user_message, ai_reply FROM messages WHERE chat_id = ? ORDER BY id ASC",
        (chat_id,)
    )
    history_rows = cursor.fetchall()

    system_prompt = MODE_PROMPTS.get(chat_row["mode"], MODE_PROMPTS[DEFAULT_MODE])

    # ── Build conversation history ──
    conversation = [{"role": "system", "content": system_prompt}]
    for row in history_rows:
        conversation.append({"role": "user", "content": row["user_message"]})
        conversation.append({"role": "assistant", "content": row["ai_reply"]})

    # ── Process uploaded files ──
    image_blocks = []
    extracted_text_chunks = []
    attachment_labels = []

    for f in uploaded_files:
        content_type = f.content_type or ""
        attachment_labels.append(f.filename)

        if content_type.startswith("image/"):
            file_bytes = f.read()
            b64 = base64.b64encode(file_bytes).decode("utf-8")
            data_uri = f"data:{content_type};base64,{b64}"
            image_blocks.append({
                "type": "image_url",
                "image_url": {"url": data_uri}
            })
        else:
            text = extract_text_from_file(f)
            if text:
                truncated = text[:MAX_EXTRACTED_CHARS]
                extracted_text_chunks.append(f"--- Content of {f.filename} ---\n{truncated}")
            else:
                extracted_text_chunks.append(f"--- {f.filename}: could not extract readable text (unsupported format) ---")

    prompt_text = user_message or "Please look at the attached file(s)."
    if extracted_text_chunks:
        prompt_text += "\n\n[Attached document content]\n" + "\n\n".join(extracted_text_chunks)

    # ── Build stored message for DB ──
    parts = []
    if user_message:
        parts.append(user_message)
    image_names = [f.filename for f in uploaded_files if (f.content_type or "").startswith("image/")]
    doc_names = [f.filename for f in uploaded_files if not (f.content_type or "").startswith("image/")]
    if image_names:
        parts.append(f"[sent {len(image_names)} image(s): {', '.join(image_names)}]")
    if doc_names:
        parts.append(f"[attached: {', '.join(doc_names)}]")
    stored_user_message = " ".join(parts) if parts else "(sent an attachment)"

    is_new_chat = chat_row["title"] == "New Chat"
    conn.close()

    # ══════════════════════════════════════════════════
    #  IMAGES → OpenRouter (free vision)
    # ══════════════════════════════════════════════════
    if image_blocks:
        or_conversation = [{"role": "system", "content": system_prompt}]
        for row in history_rows:
            or_conversation.append({"role": "user", "content": row["user_message"]})
            or_conversation.append({"role": "assistant", "content": row["ai_reply"]})
        or_conversation.append({
            "role": "user",
            "content": [{"type": "text", "text": prompt_text}] + image_blocks
        })
        or_conversation = trim_conversation(or_conversation)

        try:
            or_stream = or_client.chat.completions.create(
                model=OR_VISION_MODEL,
                messages=or_conversation,
                stream=True
            )

            def generate_or():
                accumulated = ""
                try:
                    for chunk in or_stream:
                        delta = chunk.choices[0].delta.content or ""
                        if delta:
                            accumulated += delta
                            yield delta
                except Exception as e:
                    print("OpenRouter streaming failed:", repr(e))
                    error_note = f"\n\n⚠️ Response cut short — {e}"
                    accumulated += error_note
                    yield error_note
                finally:
                    save_message(chat_id, stored_user_message, accumulated, is_new_chat)

            return Response(stream_with_context(generate_or()), mimetype="text/plain")

        except Exception as e:
            print("OpenRouter call failed:", repr(e))
            return jsonify({"error": f"Vision request failed: {e}"}), 500

    # ══════════════════════════════════════════════════
    #  TEXT ONLY → Groq
    # ══════════════════════════════════════════════════
    conversation.append({"role": "user", "content": prompt_text})
    conversation = trim_conversation(conversation)

    stream = None
    for attempt in range(3):
        try:
            stream = client.chat.completions.create(
                model=TEXT_MODEL,
                messages=conversation,
                stream=True
            )
            break
        except Exception as e:
            err_str = str(e).lower()
            if attempt < 2 and ("rate_limit" in err_str or "413" in err_str):
                wait = 3 ** (attempt + 1)
                print(f"Rate limited, trimming more & retrying in {wait}s...")
                time.sleep(wait)
                conversation = trim_conversation(conversation, max_tokens=3000)
            else:
                print("Groq call failed:", repr(e))
                return jsonify({"error": f"Groq call failed: {e}"}), 500

    if stream is None:
        return jsonify({"error": "Failed after retries"}), 500

    def generate():
        accumulated = ""
        try:
            for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    accumulated += delta
                    yield delta
        except Exception as e:
            print("Streaming failed mid-response:", repr(e))
            error_note = f"\n\n⚠️ Response cut short — {e}"
            accumulated += error_note
            yield error_note
        finally:
            save_message(chat_id, stored_user_message, accumulated, is_new_chat)

    return Response(stream_with_context(generate()), mimetype="text/plain")


@app.errorhandler(Exception)
def handle_any_error(e):
    if isinstance(e, HTTPException):
        return e
    print("Unhandled error:", repr(e))
    return jsonify({"error": str(e)}), 500


@app.route("/")
def home():
    return "yo backend running 🚀"


if __name__ == "__main__":
    app.run(debug=True, port=5000, host="0.0.0.0")