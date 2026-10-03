from flask import Flask, request, jsonify, Response, stream_with_context, g
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from dotenv import load_dotenv
from groq import Groq
from openai import OpenAI as OpenRouterClient
from pypdf import PdfReader
import base64
import json
import os
import time

from backend.db import get_db, init_db
from backend.auth import auth_bp, require_auth
load_dotenv("backend/.env")

app = Flask(__name__)

# ── CORS ──
# Prod is same-origin (cookies just work). Local dev is cross-origin
# (5173 → 5000), so we echo the dev origins and allow credentials.
_origins = [
    o.strip() for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",") if o.strip()
]
CORS(app, resources={r"/api/*": {"origins": _origins}}, supports_credentials=True,
     methods=["GET", "POST", "DELETE", "PATCH", "PUT", "OPTIONS"])

app.config["MAX_CONTENT_LENGTH"] = 4 * 1024 * 1024  # Vercel body cap is ~4.5MB

app.register_blueprint(auth_bp)

# ── Clients ──
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

or_client = OpenRouterClient(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
    default_headers={"HTTP-Referer": os.getenv("PUBLIC_APP_URL", "http://localhost:5173")}
)

# ── Models ──
TEXT_MODEL = "openai/gpt-oss-120b"
OR_VISION_MODEL = "google/gemini-2.0-flash-exp:free"

MAX_EXTRACTED_CHARS = 6000   # per uploaded document
MAX_DOC_CONTEXT_CHARS = 12000  # total stored document context per chat

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

init_db()


# ── Helpers ──
def trim_conversation(conversation, max_tokens=5500):
    """Keep system prompt + as many recent messages as fit.
    The newest message is ALWAYS kept, even if it alone exceeds the
    budget — dropping it would send the AI a conversation with no
    question in it."""
    system = conversation[0] if conversation and conversation[0]["role"] == "system" else None
    messages = conversation[1:] if system else conversation

    max_chars = max_tokens * 3
    total_chars = 0
    kept = []

    for i, msg in enumerate(reversed(messages)):
        content = msg["content"]
        if isinstance(content, list):
            chars = sum(len(p.get("text", "")) for p in content if p.get("type") == "text")
            imgs = sum(1 for p in content if p.get("type") == "image_url")
            chars += imgs * 4000
        else:
            chars = len(content)

        if i > 0 and total_chars + chars > max_chars:
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


def store_document(cursor, chat_id, filename, content):
    """Persist extracted document text so it stays available for the
    rest of the conversation, not just the upload turn. Keeps total
    stored context per chat under MAX_DOC_CONTEXT_CHARS by evicting
    the oldest documents first."""
    cursor.execute(
        "INSERT INTO documents (chat_id, filename, content) VALUES (?, ?, ?)",
        (chat_id, filename, content),
    )
    cursor.execute("SELECT SUM(LENGTH(content)) AS total FROM documents WHERE chat_id = ?", (chat_id,))
    total = cursor.fetchone()["total"] or 0
    while total > MAX_DOC_CONTEXT_CHARS:
        cursor.execute(
            "DELETE FROM documents WHERE id = (SELECT id FROM documents WHERE chat_id = ? ORDER BY id ASC LIMIT 1)",
            (chat_id,),
        )
        cursor.execute("SELECT SUM(LENGTH(content)) AS total FROM documents WHERE chat_id = ?", (chat_id,))
        total = cursor.fetchone()["total"] or 0


def get_document_context(cursor, chat_id):
    cursor.execute("SELECT filename, content FROM documents WHERE chat_id = ? ORDER BY id ASC", (chat_id,))
    rows = cursor.fetchall()
    if not rows:
        return None
    return "\n\n".join(f"--- Document: {r['filename']} ---\n{r['content']}" for r in rows)


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

QUIZ_SYSTEM_PROMPT = """You create accurate study materials from the supplied material.
Return only valid JSON matching the requested schema.
Do not invent facts that are not supported by the supplied material.
Keep questions clear, concise, and useful for studying."""


def _parse_study_json(raw):
    """Parse model JSON, tolerating accidental markdown fences."""
    text = (raw or "").strip()

    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    return json.loads(text)


def _validate_study_set(data, kind):
    """Validate and normalize model-generated study material."""
    if not isinstance(data, dict):
        raise ValueError("Study set must be an object.")

    title = str(data.get("title") or "Study Set").strip()[:120]

    if kind == "flashcards":
        raw_cards = data.get("cards")
        if not isinstance(raw_cards, list):
            raise ValueError("Invalid flashcard payload.")

        cards = []
        for card in raw_cards[:8]:
            if not isinstance(card, dict):
                continue

            front = str(card.get("front") or "").strip()
            back = str(card.get("back") or "").strip()

            if front and back:
                cards.append({
                    "front": front[:500],
                    "back": back[:1200],
                })

        if not cards:
            raise ValueError("No valid flashcards generated.")

        return {
            "kind": "flashcards",
            "title": title,
            "cards": cards,
        }

    raw_questions = data.get("questions")
    if not isinstance(raw_questions, list):
        raise ValueError("Invalid quiz payload.")

    questions = []

    for question in raw_questions[:5]:
        if not isinstance(question, dict):
            continue

        q = str(question.get("q") or "").strip()
        options = question.get("options")
        explanation = str(question.get("explanation") or "").strip()

        if not q or not isinstance(options, list) or len(options) != 4:
            continue

        options = [str(option).strip() for option in options]

        if not all(options):
            continue

        try:
            answer = int(question.get("answer", 0))
        except (TypeError, ValueError):
            answer = 0

        answer = max(0, min(3, answer))

        questions.append({
            "q": q[:700],
            "options": [option[:300] for option in options],
            "answer": answer,
            "explanation": explanation[:800],
        })

    if not questions:
        raise ValueError("No valid quiz questions generated.")

    return {
        "kind": "quiz",
        "title": title,
        "questions": questions,
    }


def generate_study_set(cursor, chat_id, kind, topic="", document_id=None):
    """Generate a quiz or flashcard deck from chat history and documents."""
    if document_id:
        cursor.execute(
            "SELECT filename, content FROM documents WHERE id = ? AND chat_id = ?",
            (document_id, chat_id),
        )
    else:
        cursor.execute(
            "SELECT filename, content FROM documents WHERE chat_id = ? ORDER BY id ASC",
            (chat_id,),
        )
    document_rows = cursor.fetchall()

    source_parts = []

    for row in document_rows:
        source_parts.append(
            f"--- Document: {row['filename']} ---\n{row['content']}"
        )

    if not source_parts:
        cursor.execute(
            "SELECT user_message, ai_reply FROM messages "
            "WHERE chat_id = ? ORDER BY id ASC",
            (chat_id,),
        )
        rows = cursor.fetchall()

        if rows:
            source_parts.append(
                "\n\n".join(
                    f"User: {row['user_message']}\n"
                    f"yo: {(row['ai_reply'] or '')[:1500]}"
                    for row in rows
                )
            )

    source = "\n\n".join(source_parts)

    if not source.strip():
        return None

    if kind == "flashcards":
        spec = (
            "Create 8 study flashcards from the material. "
            "Respond with ONLY this JSON shape: "
            '{"title": "short deck title", '
            '"cards": [{"front": "term or question", '
            '"back": "clear answer or explanation"}]}'
        )
    else:
        spec = (
            "Create 5 multiple-choice exam-style questions from the material. "
            "Exactly 4 options per question. Vary which option index is correct. "
            "Respond with ONLY this JSON shape: "
            '{"title": "short quiz title", '
            '"questions": [{"q": "question text", '
            '"options": ["opt1", "opt2", "opt3", "opt4"], '
            '"answer": 0, '
            '"explanation": "one or two sentences: why this answer is right"}]} '
            'where "answer" is the 0-based index of the correct option.'
        )

    if topic:
        spec += f'\nFocus on this topic if present: "{topic}".'

    user_content = (
        f"Study material:\n{source[:12000]}\n\n{spec}"
    )

    last_err = None

    for attempt in range(2):
        try:
            try:
                resp = client.chat.completions.create(
                    model=TEXT_MODEL,
                    messages=[
                        {"role": "system", "content": QUIZ_SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.7,
                )
            except Exception:
                resp = client.chat.completions.create(
                    model=TEXT_MODEL,
                    messages=[
                        {"role": "system", "content": QUIZ_SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                    ],
                    temperature=0.7,
                )

            data = _parse_study_json(
                resp.choices[0].message.content
            )

            return _validate_study_set(data, kind)

        except Exception as e:
            last_err = e
            print(
                f"Study set generation attempt {attempt + 1} failed:",
                repr(e),
            )

    raise last_err

# ── Routes ──
@app.route("/api/new-chat", methods=["POST"])
@require_auth
def new_chat():
    data = request.get_json(silent=True) or {}
    mode = data.get("mode")
    if mode not in MODE_PROMPTS:
        mode = DEFAULT_MODE

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
    "INSERT INTO chats (user_id, title, mode) VALUES (?, ?, ?) RETURNING id",
    (g.user["id"], "New Chat", mode),
)
    row = cursor.fetchone()
    chat_id = row["id"]
    conn.commit()
    conn.close()

    return jsonify({"chat_id": chat_id})


@app.route("/api/chats", methods=["GET"])
@require_auth
def get_chats():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, mode, is_pinned FROM chats
        WHERE user_id = ?
        ORDER BY
            (SELECT MAX(created_at) FROM messages WHERE messages.chat_id = chats.id) DESC,
            id DESC
    """, (g.user["id"],))
    rows = cursor.fetchall()
    conn.close()
    chats = [{"id": row["id"], "title": row["title"], "mode": row["mode"], "is_pinned": bool(row["is_pinned"])} for row in rows]
    return jsonify(chats)


@app.route("/api/chats/<int:chat_id>", methods=["PATCH"])
@require_auth
def update_chat(chat_id):
    try:
        data = request.get_json(silent=True) or {}
        if not data:
            return jsonify({"error": "no data provided"}), 400

        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM chats WHERE id = ? AND user_id = ?", (chat_id, g.user["id"]))
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
@require_auth
def get_chat_messages(chat_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT title, mode FROM chats WHERE id = ? AND user_id = ?",
            (chat_id, g.user["id"])
        )
        chat_row = cursor.fetchone()

        if chat_row is None:
            conn.close()
            return jsonify({"error": "chat not found"}), 404

        cursor.execute(
            "SELECT id, user_message, ai_reply, feedback FROM messages WHERE chat_id = ? ORDER BY id ASC",
            (chat_id,)
        )
        rows = cursor.fetchall()

        cursor.execute(
            "SELECT id, filename FROM documents WHERE chat_id = ? ORDER BY id ASC",
            (chat_id,)
        )
        document_rows = cursor.fetchall()

        conn.close()

        messages = [
            {
                "id": row["id"],
                "user": row["user_message"],
                "ai": row["ai_reply"],
                "feedback": row["feedback"]
            }
            for row in rows
        ]

        documents = [
            {
                "id": row["id"],
                "filename": row["filename"]
            }
            for row in document_rows
        ]

        return jsonify({
            "title": chat_row["title"],
            "mode": chat_row["mode"],
            "messages": messages,
            "documents": documents
        })

    except Exception as e:
        print("get_chat_messages failed:", repr(e))
        return jsonify({"error": str(e)}), 500


@app.route("/api/chat/<int:chat_id>", methods=["DELETE"])
@require_auth
def delete_chat(chat_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM chats WHERE id = ? AND user_id = ?",
            (chat_id, g.user["id"])
        )
        if cursor.fetchone() is None:
            conn.close()
            return jsonify({"error": "chat not found"}), 404

        cursor.execute("DELETE FROM documents WHERE chat_id = ?", (chat_id,))
        cursor.execute("DELETE FROM messages WHERE chat_id = ?", (chat_id,))
        cursor.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
        conn.commit()
        conn.close()
        return jsonify({"deleted": chat_id})

    except Exception as e:
        print("delete_chat failed:", repr(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/chats", methods=["DELETE"])
@require_auth
def clear_all_chats():
    """Clear every conversation owned by the authenticated user —
    chats plus their messages, documents and quizzes. The account
    itself is untouched. Ownership always resolves through the
    session user; no IDs are accepted from the client."""
    try:
        user_id = g.user["id"]
        conn = get_db()
        cursor = conn.cursor()

        # children first, chats last — on local SQLite these four
        # statements commit as one transaction. On Turso's HTTP protocol
        # each statement auto-commits (see db.py), so ordering matters:
        # a mid-failure can only leave same-user orphan rows, which a
        # retry removes.
        cursor.execute(
            "DELETE FROM messages WHERE chat_id IN (SELECT id FROM chats WHERE user_id = ?)",
            (user_id,),
        )
        cursor.execute(
            "DELETE FROM documents WHERE chat_id IN (SELECT id FROM chats WHERE user_id = ?)",
            (user_id,),
        )
        cursor.execute(
            "DELETE FROM quizzes WHERE chat_id IN (SELECT id FROM chats WHERE user_id = ?)",
            (user_id,),
        )
        cursor.execute("DELETE FROM chats WHERE user_id = ?", (user_id,))

        conn.commit()
        conn.close()
        return jsonify({"ok": True})

    except Exception as e:
        print("clear_all_chats failed:", repr(e))
        return jsonify({"error": "Couldn't clear history. Nothing was deleted."}), 500

# Regenerate / edit support: remove the message pair the user is
# regenerating (or editing), plus everything after it, so the database
# stays consistent with what the UI shows.
@app.route("/api/chat/<int:chat_id>/messages", methods=["DELETE"])
@require_auth
def truncate_messages(chat_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM chats WHERE id = ? AND user_id = ?",
            (chat_id, g.user["id"])
        )
        if cursor.fetchone() is None:
            conn.close()
            return jsonify({"error": "chat not found"}), 404

        from_id = request.args.get("from_id", type=int)
        if from_id:
            cursor.execute(
                "DELETE FROM messages WHERE chat_id = ? AND id >= ?",
                (chat_id, from_id)
            )
        else:
            cursor.execute(
                "DELETE FROM messages WHERE id = (SELECT id FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT 1)",
                (chat_id,)
            )
        conn.commit()
        conn.close()
        return jsonify({"ok": True})

    except Exception as e:
        print("truncate_messages failed:", repr(e))
        return jsonify({"error": str(e)}), 500


@app.route("/api/message/<int:message_id>/feedback", methods=["PUT"])
@require_auth
def message_feedback(message_id):
    try:
        data = request.get_json(silent=True) or {}
        fb = data.get("feedback")
        if fb not in ("thumbsup", "thumbsdown", None):
            return jsonify({"error": "invalid feedback value"}), 400

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT m.id FROM messages m
               JOIN chats c ON c.id = m.chat_id
               WHERE m.id = ? AND c.user_id = ?""",
            (message_id, g.user["id"]),
        )
        if cursor.fetchone() is None:
            conn.close()
            return jsonify({"error": "message not found"}), 404

        cursor.execute(
            "UPDATE messages SET feedback = ? WHERE id = ?",
            (fb, message_id)
        )
        conn.commit()
        conn.close()
        return jsonify({"ok": True})

    except Exception as e:
        print("message_feedback failed:", repr(e))
        return jsonify({"error": str(e)}), 500


@app.route("/api/chat/<int:chat_id>/quiz", methods=["POST"])
@require_auth
def create_quiz(chat_id):
    try:
        data = request.get_json(silent=True) or {}

        kind = (
            data.get("kind")
            if data.get("kind") in ("quiz", "flashcards")
            else "quiz"
        )

        topic = (data.get("topic") or "").strip()[:120]
        document_id = data.get("document_id")

        conn = get_db()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id FROM chats WHERE id = ? AND user_id = ?",
            (chat_id, g.user["id"]),
        )

        if cursor.fetchone() is None:
            conn.close()
            return jsonify({"error": "chat not found"}), 404

        try:
            study_set = generate_study_set(
            cursor,
            chat_id,
            kind,
            topic,
            document_id,
        )
        except Exception as e:
            print("Study set failed:", repr(e))
            conn.close()
            return jsonify({
                "error": (
                    "Couldn't build a study set from this chat — "
                    "add notes or a longer conversation and try again."
                )
            }), 502

        if study_set is None:
            conn.close()
            return jsonify({
                "error": (
                    "Nothing to quiz on yet — send some messages "
                    "or upload notes first."
                )
            }), 400

        conn.close()

        return jsonify(study_set)

    except Exception as e:
        print("create_quiz failed:", repr(e))
        return jsonify({"error": "Quiz generation failed. Try again."}), 500

@app.route("/api/chat", methods=["POST"])
@require_auth
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

    cursor.execute("SELECT id, title, mode FROM chats WHERE id = ? AND user_id = ?", (chat_id, g.user["id"]))
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

    # ── Persistent document context (P2) ──
    # Extracted text is stored per chat, so follow-up questions about an
    # uploaded PDF still work on later turns. Docs ride inside the system
    # prompt (never trimmed), capped by MAX_DOC_CONTEXT_CHARS; history
    # budget shrinks to keep total prompt tokens in check.
    doc_context = get_document_context(cursor, chat_id)
    if doc_context:
        system_prompt += (
            "\n\nThe user has attached study documents to this conversation. "
            "Ground your answers in them when relevant:\n" + doc_context
        )
        history_budget = 3500
    else:
        history_budget = 5500

    # ── Build conversation history ──
    conversation = [{"role": "system", "content": system_prompt}]
    for row in history_rows:
        conversation.append({"role": "user", "content": row["user_message"]})
        conversation.append({"role": "assistant", "content": row["ai_reply"]})

    # ── Process uploaded files ──
    image_blocks = []
    extracted_text_chunks = []

    for f in uploaded_files:
        content_type = f.content_type or ""

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
                store_document(cursor, chat_id, f.filename, truncated)
                extracted_text_chunks.append(f"--- Content of {f.filename} ---\n{truncated}")
            else:
                extracted_text_chunks.append(f"--- {f.filename}: could not extract readable text (unsupported format) ---")

    conn.commit()  # persist any newly stored documents

    prompt_text = user_message or "Please look at the attached file(s). Give me a short summary and the key topics they cover."
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
        or_conversation = trim_conversation(or_conversation, max_tokens=history_budget)

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
                    error_note = "\n\n⚠️ Response cut short — please try again."
                    accumulated += error_note
                    yield error_note
                finally:
                    save_message(chat_id, stored_user_message, accumulated, is_new_chat)

            return Response(stream_with_context(generate_or()), mimetype="text/plain")

        except Exception as e:
            print("OpenRouter call failed:", repr(e))
            return jsonify({"error": "Vision request failed. Please try again."}), 500

    # ══════════════════════════════════════════════════
    #  TEXT ONLY → Groq
    # ══════════════════════════════════════════════════
    conversation.append({"role": "user", "content": prompt_text})
    conversation = trim_conversation(conversation, max_tokens=history_budget)

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
                return jsonify({"error": "yo's catching a breath 💀 try again."}), 500

    if stream is None:
        return jsonify({"error": "yo's hit its usage limit for now — try again in a bit 💀"}), 500

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
            error_note = "\n\n⚠️ Response cut short — please try again."
            accumulated += error_note
            yield error_note
        finally:
            save_message(chat_id, stored_user_message, accumulated, is_new_chat)

    return Response(stream_with_context(generate()), mimetype="text/plain")

# ══════════════════════════════════════════════════
#  GUEST CHAT — landing-page trial, zero persistence
# ══════════════════════════════════════════════════
# Visitors can try YO without an account:
#  - NEVER touches the database (no chats/messages/history rows)
#  - conversation context comes from the client, lives only in the request
#  - enforced per-IP: 12 messages / rolling 24h (in-memory, best-effort on
#    serverless — same ephemerality trade-off as the auth rate limiter)

GUEST_LIMIT = 12
GUEST_WINDOW = 24 * 60 * 60          # seconds
GUEST_MAX_HISTORY = 24               # max prior messages accepted (12 pairs)
GUEST_MAX_CHARS = 2000               # per-message cap

_guest_usage = {}                    # ip -> [timestamps]

@app.route("/api/guest/chat", methods=["POST"])
def guest_chat():
    ip = request.remote_addr or "unknown"
    now = time.time()
    stamps = [t for t in _guest_usage.get(ip, []) if now - t < GUEST_WINDOW]

    if len(stamps) >= GUEST_LIMIT:
        return jsonify({"error": "guest_limit_reached"}), 429

    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "message is required"}), 400
    if len(message) > GUEST_MAX_CHARS:
        message = message[:GUEST_MAX_CHARS]

    # sanitize client-supplied history — never trust it blindly
    clean_history = []
    for m in (data.get("history") or [])[-GUEST_MAX_HISTORY:]:
        if not isinstance(m, dict):
            continue
        role = m.get("role")
        content = str(m.get("content") or "")[:GUEST_MAX_CHARS].strip()
        if role in ("user", "assistant") and content:
            clean_history.append({"role": role, "content": content})

        GUEST_PROMPT = (
        "You are yo — a student's AI learning companion. You're calm, sharp, "
        "slightly playful, never corporate. Talk like a smart friend: lowercase, "
        "short sentences, no 'I'd be happy to help', no 'Great question!', no "
        "emoji, no exclamation marks. Get straight to the point, explain things "
        "simply, and end with a question or suggestion that moves the student "
        "forward. This is a quick first conversation on the landing page — keep "
        "replies short (2-4 sentences) and warm but direct."
    )

        GUEST_PROMPT = (
        "You are yo — a student's AI learning companion. Calm, sharp, slightly "
        "playful, never corporate. Talk like a smart friend: lowercase, short "
        "sentences. Never say 'I'd be happy to help', 'Great question!', or any "
        "generic assistant phrases. No emoji. No exclamation marks. Never reply "
        "with just '...', a single word, or an empty response — always say "
        "something real. If the user's message is unclear, gibberish, or a test, "
        "briefly ask what they're trying to learn and offer a topic to start "
        "with. Get straight to the point, explain simply, and end with a "
        "question or suggestion that moves the student forward. This is a quick "
        "first conversation on the landing page — keep replies short "
        "(2-4 sentences)."
    )

    conversation = (
        [{"role": "system", "content": GUEST_PROMPT}]
        + clean_history
        + [{"role": "user", "content": message}]
    )
    conversation = trim_conversation(conversation, max_tokens=4000)

    # count this message against the guest allowance
    stamps.append(now)
    _guest_usage[ip] = stamps

    try:
        stream = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=conversation,
            stream=True,
        )
    except Exception as e:
        # provider failed before anything streamed — refund the message
        stamps.pop()
        _guest_usage[ip] = stamps
        print("Guest chat failed:", repr(e))
        return jsonify({"error": "yo's catching a breath — try again."}), 500

    def generate():
        try:
            for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    yield delta
        except Exception as e:
            print("Guest streaming failed:", repr(e))
            yield "\n\n⚠️ Response cut short — please try again."

    return Response(stream_with_context(generate()), mimetype="text/plain")



@app.errorhandler(Exception)
def handle_any_error(e):
    if isinstance(e, HTTPException):
        return e
    print("Unhandled error:", repr(e))
    return jsonify({"error": str(e)}), 500


@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File too large — keep uploads under 4MB."}), 413


@app.route("/")
def home():
    return "yo backend running 🚀"


if __name__ == "__main__":
    app.run(debug=True, port=5000, host="0.0.0.0")
