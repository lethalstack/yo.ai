import os
import sqlite3

import libsql_client

TURSO_DB_URL = os.getenv("TURSO_DB_URL")
TURSO_DB_TOKEN = os.getenv("TURSO_DB_TOKEN")
USE_TURSO = bool(TURSO_DB_URL)
DB_PATH = "chat.db"  # local dev only


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
        # https:// instead of libsql:// — avoids WebSockets on serverless
        http_url = TURSO_DB_URL.replace("libsql://", "https://", 1)
        self._client = libsql_client.create_client_sync(
            url=http_url, auth_token=TURSO_DB_TOKEN
        )

    def cursor(self):
        return LibsqlCursor(self._client)

    def execute(self, sql, params=None):
        return self.cursor().execute(sql, params)

    def commit(self):
        pass  # auto-commit over Turso HTTP protocol

    def close(self):
        self._client.close()


def get_db():
    if USE_TURSO:
        return LibsqlConn()

    conn = sqlite3.connect(
        DB_PATH,
        timeout=30,
    )
    conn.row_factory = sqlite3.Row

    # Local SQLite: allow concurrent reads and wait briefly
    # instead of immediately failing when another request is writing.
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")

    return conn


SCHEMA = [
    """CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    email_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )""",
    """CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )""",
    """CREATE TABLE IF NOT EXISTS auth_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        code_hash TEXT NOT NULL,
        purpose TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )""",
    """CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL DEFAULT 'New Chat',
        mode TEXT NOT NULL DEFAULT 'chill',
        is_pinned INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )""",
    """CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        user_message TEXT,
        ai_reply TEXT,
        feedback TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )""",
]


def init_db():
    conn = get_db()
    cur = conn.cursor()
    for stmt in SCHEMA:
        cur.execute(stmt)
    conn.commit()
    conn.close()
