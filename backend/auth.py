import functools
import hashlib
import os
import re
import secrets
import time

import requests
from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, jsonify, request
from werkzeug.security import generate_password_hash, check_password_hash

from backend.db import get_db
from backend.mailer import send_email, build_email_html

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

SESSION_COOKIE = "yo_session"
SESSION_TTL_DAYS = 30
CODE_TTL_MINUTES = {"verify": 15, "reset": 30}
MAX_CODES_PER_HOUR = 5
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# In-memory IP rate limiting — best-effort on serverless (instances are
# ephemeral), but still blunts bursts within a warm instance.
_rate_bucket = {}


def _allow(key, limit, window_seconds):
    now = time.time()
    recent = [t for t in _rate_bucket.get(key, []) if now - t < window_seconds]
    if len(recent) >= limit:
        return False
    recent.append(now)
    _rate_bucket[key] = recent
    return True


def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def _expires(**kwargs):
    return (datetime.now(timezone.utc) + timedelta(**kwargs)).strftime("%Y-%m-%d %H:%M:%S")


def _hash(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _is_https():
    # Works on Vercel (X-Forwarded-Proto) and stays False on local/LAN http,
    # so the session cookie still works when testing from a phone.
    return request.is_secure or request.headers.get("X-Forwarded-Proto") == "https"


def _set_session_cookie(resp, token):
    resp.set_cookie(
        SESSION_COOKIE, token,
        max_age=SESSION_TTL_DAYS * 86400,
        httponly=True, samesite="Lax", secure=_is_https(), path="/",
    )
    return resp


def require_auth(f):
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        raw = request.cookies.get(SESSION_COOKIE)
        print("[AUTH DEBUG] cookie present:", bool(raw))

        if not raw:
            return jsonify({"error": "authentication required"}), 401

        conn = get_db()
        cur = conn.cursor()

        cur.execute(
            """SELECT users.id, users.email, users.display_name, users.profile_picture
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ? AND sessions.expires_at > ?""",
            (_hash(raw), _now()),
        )

        row = cur.fetchone()
        conn.close()

        if not row:
            return jsonify({"error": "authentication required"}), 401

        g.user = {
            "id": row["id"],
            "email": row["email"],
            "display_name": row["display_name"],
            "profile_picture": row["profile_picture"],
        }

        return f(*args, **kwargs)

    return wrapper


def _create_session(cur, user_id):
    raw = secrets.token_urlsafe(32)
    cur.execute(
        "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        (user_id, _hash(raw), _expires(days=SESSION_TTL_DAYS)),
    )
    return raw


def _issue_code(cur, user_id, purpose):
    cur.execute(
        "SELECT COUNT(*) AS c FROM auth_tokens WHERE user_id = ? AND purpose = ? AND created_at > ?",
        (user_id, purpose, _expires(hours=-1)),
    )
    if (cur.fetchone()["c"] or 0) >= MAX_CODES_PER_HOUR:
        return None
    code = f"{secrets.randbelow(1000000):06d}"
    cur.execute(
        "INSERT INTO auth_tokens (user_id, code_hash, purpose, expires_at) VALUES (?, ?, ?, ?)",
        (user_id, _hash(code), purpose, _expires(minutes=CODE_TTL_MINUTES[purpose])),
    )
    return code


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    name = " ".join((data.get("name") or "").split())[:40]
    password = data.get("password") or ""

    if not EMAIL_RE.match(email):
        return jsonify({"error": "Enter a valid email address."}), 400
        if not name:
            return jsonify({"error": "Please enter your name."}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if not _allow(f"reg:{request.remote_addr}", 10, 600):
        return jsonify({"error": "Too many attempts. Try again shortly."}), 429

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
    "SELECT id, email_verified FROM users WHERE lower(email) = ?",
    (email,),
    )
    row = cur.fetchone()

    if row and row["email_verified"]:
        conn.close()
        return jsonify({"error": "An account with this email already exists. Sign in instead."}), 409

    pw_hash = generate_password_hash(password)
    if row:
        # unverified signup restarted — update name + password, reissue code
        user_id = row["id"]
        cur.execute(
            "UPDATE users SET display_name = ?, password_hash = ? WHERE id = ?",
            (name, pw_hash, user_id),
        )
    else:
        cur.execute(
            "INSERT INTO users (email, display_name, password_hash) VALUES (?, ?, ?) RETURNING id",
            (email, name, pw_hash),
        )
        user_id = cur.lastrowid

    code = _issue_code(cur, user_id, "verify")
    conn.commit()
    conn.close()

    if code is None:
        return jsonify({"error": "Too many verification emails. Try again later."}), 429

    try:
        send_email(email, "Your YO verification code", build_email_html("Verify your email", code))
    except Exception as e:
        print("Verification email failed:", repr(e))
        return jsonify({"error": "Could not send the verification email. Try resending."}), 502

    payload = {"ok": True, "email": email}
    if os.getenv("AUTH_DEBUG_EXPOSE_CODE") == "1":  # LOCAL DEV ONLY — never set in prod
        payload["debug_code"] = code
    return jsonify(payload)


@auth_bp.route("/verify", methods=["POST"])
def verify():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    code = (data.get("code") or "").strip()

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, email_verified FROM users WHERE lower(email) = ?", (email,))
    row = cur.fetchone()
    print("[AUTH DEBUG] session found:", bool(row))

    if not row:
        conn.close()
        return jsonify({"error": "Invalid or expired code."}), 400

    user_id, verified = row["id"], row["email_verified"]

    if not verified:
        cur.execute(
            """SELECT id FROM auth_tokens
               WHERE user_id = ? AND purpose = 'verify' AND used = 0
                 AND code_hash = ? AND expires_at > ?
               ORDER BY id DESC LIMIT 1""",
            (user_id, _hash(code), _now()),
        )
        tok = cur.fetchone()
        if not tok:
            conn.close()
            return jsonify({"error": "Invalid or expired code."}), 400
        cur.execute("UPDATE auth_tokens SET used = 1 WHERE id = ?", (tok["id"],))
        cur.execute("UPDATE users SET email_verified = 1 WHERE id = ?", (user_id,))

    token = _create_session(cur, user_id)  # verified → straight into the app

    cur.execute("SELECT display_name FROM users WHERE id = ?", (user_id,))
    user_row = cur.fetchone()

    conn.commit()
    conn.close()

    resp = jsonify({
        "user": {
            "id": user_id,
            "email": email,
            "display_name": user_row["display_name"] if user_row else None,
        }
    })
    return _set_session_cookie(resp, token)


@auth_bp.route("/resend", methods=["POST"])
def resend():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not _allow(f"resend:{request.remote_addr}", 5, 600):
        return jsonify({"error": "Too many attempts. Try again shortly."}), 429

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE lower(email) = ? AND email_verified = 0", (email,))
    row = cur.fetchone()
    code = None
    if row:
        code = _issue_code(cur, row["id"], "verify")
        conn.commit()
    conn.close()

    if row and code is None:
        return jsonify({"error": "Too many verification emails. Try again later."}), 429

    if code:
        try:
            send_email(email, "Your YO verification code", build_email_html("Verify your email", code))
        except Exception as e:
            print("Resend email failed:", repr(e))
            return jsonify({"error": "Could not send the email. Try again."}), 502

    # same response shape whether or not the account exists — no user enumeration
    payload = {"ok": True}
    if code and os.getenv("AUTH_DEBUG_EXPOSE_CODE") == "1":
        payload["debug_code"] = code
    return jsonify(payload)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not _allow(f"login:{request.remote_addr}", 10, 300):
        return jsonify({"error": "Too many attempts. Try again shortly."}), 429

    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM sessions WHERE expires_at < ?", (_now(),))  # hygiene
    cur.execute(
    "SELECT id, email_verified, password_hash, display_name FROM users WHERE lower(email) = ?",
    (email,),
    )
    row = cur.fetchone()

    if not row or not check_password_hash(row["password_hash"], password):
        conn.close()
        return jsonify({"error": "Invalid email or password."}), 401

    if not row["email_verified"]:
        conn.close()
        return jsonify({"error": "email_not_verified", "email": email}), 403

    token = _create_session(cur, row["id"])
    conn.commit()
    conn.close()

    resp = jsonify({
    "user": {
        "id": row["id"],
        "email": email,
        "display_name": row["display_name"],
    }
    })
    return _set_session_cookie(resp, token)


@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    raw = request.cookies.get(SESSION_COOKIE)
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM sessions WHERE token_hash = ?", (_hash(raw),))
    conn.commit()
    conn.close()
    resp = jsonify({"ok": True})
    resp.delete_cookie(SESSION_COOKIE, path="/")
    return resp


@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    return jsonify({
    "user": {
        "id": g.user["id"],
        "email": g.user["email"],
        "display_name": g.user["display_name"],
        "profile_picture": g.user["profile_picture"],
    }
})


@auth_bp.route("/forgot", methods=["POST"])
def forgot():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not _allow(f"forgot:{request.remote_addr}", 5, 600):
        return jsonify({"error": "Too many attempts. Try again shortly."}), 429

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE lower(email) = ?", (email,))
    row = cur.fetchone()
    code = None
    if row:
        code = _issue_code(cur, row["id"], "reset")
        conn.commit()
    conn.close()

    if code:
        try:
            send_email(email, "Reset your YO password", build_email_html("Reset your password", code))
        except Exception as e:
            print("Reset email failed:", repr(e))
            return jsonify({"error": "Could not send the email. Try again."}), 502

    payload = {"ok": True}
    if code and os.getenv("AUTH_DEBUG_EXPOSE_CODE") == "1":
        payload["debug_code"] = code
    return jsonify(payload)


@auth_bp.route("/reset", methods=["POST"])
def reset():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    code = (data.get("code") or "").strip()
    new_password = data.get("new_password") or ""

    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE lower(email) = ?", (email,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Invalid or expired code."}), 400

    cur.execute(
        """SELECT id FROM auth_tokens
           WHERE user_id = ? AND purpose = 'reset' AND used = 0
             AND code_hash = ? AND expires_at > ?
           ORDER BY id DESC LIMIT 1""",
        (row["id"], _hash(code), _now()),
    )
    tok = cur.fetchone()
    if not tok:
        conn.close()
        return jsonify({"error": "Invalid or expired code."}), 400

    cur.execute("UPDATE auth_tokens SET used = 1 WHERE id = ?", (tok["id"],))
    cur.execute("UPDATE users SET password_hash = ? WHERE id = ?",
                (generate_password_hash(new_password), row["id"]))
    cur.execute("DELETE FROM sessions WHERE user_id = ?", (row["id"],))  # log out everywhere
    conn.commit()
    conn.close()

    return jsonify({"ok": True})

@auth_bp.route("/google", methods=["POST"])
def google_auth():
    data = request.get_json(silent=True) or {}
    credential = data.get("credential") or ""

    if not credential:
        return jsonify({"error": "Missing Google credential."}), 400

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        return jsonify({"error": "Google sign-in is not configured."}), 500

    if not _allow(f"google:{request.remote_addr}", 10, 300):
        return jsonify({"error": "Too many attempts. Try again shortly."}), 429

    # Verify the ID token with Google itself.
    try:
        r = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": credential},
            timeout=10,
        )
        if r.status_code != 200:
            return jsonify({"error": "Google sign-in failed. Try again."}), 401
        info = r.json()
    except Exception as e:
        print("Google tokeninfo failed:", repr(e))
        return jsonify({"error": "Google sign-in failed. Try again."}), 502

    # aud must be OUR client id — otherwise a token Google minted for some
    # other app could be replayed here. This check is the security-critical one.
    if info.get("aud") != client_id:
        return jsonify({"error": "Google sign-in failed. Try again."}), 401

    if info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        return jsonify({"error": "Google sign-in failed. Try again."}), 401

    try:
        if int(info.get("exp", "0")) < int(time.time()):
            return jsonify({"error": "Google session expired. Try again."}), 401
    except ValueError:
        return jsonify({"error": "Google sign-in failed. Try again."}), 401

    email = (info.get("email") or "").strip().lower()
    if not email or info.get("email_verified") not in ("true", "True", True, "1", 1):
        return jsonify({"error": "Your Google account has no verified email."}), 401

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
    "SELECT id, email_verified, display_name, profile_picture FROM users WHERE lower(email) = ?",
    (email,),
    )
    row = cur.fetchone()

    if row:
        user_id = row["id"]
        display_name = row["display_name"]
        profile_picture = row["profile_picture"]

        # Google already verified this email — trust it and mark verified
        if not row["email_verified"]:
            cur.execute("UPDATE users SET email_verified = 1 WHERE id = ?", (user_id,))

        # Keep the latest Google profile picture for existing accounts.
        if info.get("picture"):
            profile_picture = info.get("picture")
            cur.execute(
                "UPDATE users SET profile_picture = ? WHERE id = ?",
                (profile_picture, user_id),
            )

        # Fill display_name from the verified Google profile ONLY when
        # empty — never overwrite a name the user has chosen or kept.
        if not display_name and info.get("name"):
            display_name = info.get("name")
            cur.execute(
                "UPDATE users SET display_name = ? WHERE id = ?",
                (display_name, user_id),
            )
    else:
        # New account. Password is unusable random — Google-only login.
        # (User can set a real password later via Forgot Password, which
        # works because the email is verified.)
        profile_picture = info.get("picture")
        display_name = info.get("name")
        cur.execute(
            "INSERT INTO users (email, display_name, password_hash, email_verified, profile_picture) VALUES (?, ?, ?, 1, ?) RETURNING id",
            (
                email,
                display_name,
                generate_password_hash(secrets.token_urlsafe(32)),
                profile_picture,
            ),
        )
        user_id = cur.lastrowid

    token = _create_session(cur, user_id)
    conn.commit()
    conn.close()

    resp = jsonify({
        "user": {
            "id": user_id,
            "email": email,
            "display_name": display_name,
            "profile_picture": profile_picture,
        }
    })
    return _set_session_cookie(resp, token)

@auth_bp.route("/display-name", methods=["POST"])
@require_auth
def set_display_name():
    data = request.get_json(silent=True) or {}
    name = " ".join((data.get("name") or "").split())[:40]
    if not name:
        return jsonify({"error": "Name can't be empty."}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE users SET display_name = ? WHERE id = ?", (name, g.user["id"]))
    conn.commit()
    conn.close()

    # profile_picture included so the frontend can merge the whole
    # response into its user object without blanking the avatar
    return jsonify({
        "user": {
            "id": g.user["id"],
            "email": g.user["email"],
            "display_name": name,
            "profile_picture": g.user["profile_picture"],
        }
    })

@auth_bp.route("/delete-account", methods=["POST"])
@require_auth
def delete_account():
    """Permanently delete the authenticated account and every record
    owned by it. The target user always comes from the session —
    never from the request body."""
    user_id = g.user["id"]

    conn = get_db()
    cur = conn.cursor()

    # children first, user row last — if anything fails mid-way the
    # account still exists and the operation can be retried
    cur.execute(
        "DELETE FROM messages WHERE chat_id IN (SELECT id FROM chats WHERE user_id = ?)",
        (user_id,),
    )
    cur.execute(
        "DELETE FROM documents WHERE chat_id IN (SELECT id FROM chats WHERE user_id = ?)",
        (user_id,),
    )
    cur.execute(
        "DELETE FROM quizzes WHERE chat_id IN (SELECT id FROM chats WHERE user_id = ?)",
        (user_id,),
    )
    cur.execute("DELETE FROM chats WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM auth_tokens WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM users WHERE id = ?", (user_id,))

    conn.commit()
    conn.close()

    print(f"[AUTH] account {user_id} deleted")

    resp = jsonify({"ok": True})
    resp.delete_cookie(SESSION_COOKIE, path="/")
    return resp