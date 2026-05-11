from __future__ import annotations

import json
import sqlite3
from contextlib import closing
from datetime import datetime
from typing import Any, Dict, List
import sqlite3

from .config import load_config


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    score INTEGER NOT NULL,
    resume_text TEXT NOT NULL,
    job_text TEXT NOT NULL,
    matched_skills TEXT NOT NULL,
    missing_skills TEXT NOT NULL,
    job_source TEXT,
    job_url TEXT,
    job_title TEXT,
    job_company TEXT,
    user_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
"""


def _connect(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


def init_db(db_path: str | None = None) -> None:
    cfg = load_config()
    path = db_path or cfg.db_path
    with closing(_connect(path)) as conn:
        conn.executescript(SCHEMA)
        # Lightweight migration: ensure optional job metadata columns exist
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(analyses)")
        cols = {row[1] for row in cur.fetchall()}  # type: ignore[index]
        to_add = []
        if "job_source" not in cols:
            to_add.append(("job_source", "TEXT"))
        if "job_url" not in cols:
            to_add.append(("job_url", "TEXT"))
        if "job_title" not in cols:
            to_add.append(("job_title", "TEXT"))
        if "job_company" not in cols:
            to_add.append(("job_company", "TEXT"))
        if "user_id" not in cols:
            to_add.append(("user_id", "INTEGER"))
        for name, typ in to_add:
            cur.execute(f"ALTER TABLE analyses ADD COLUMN {name} {typ}")
        conn.commit()

        # Ensure users table exists (older DBs may lack it)
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cur.fetchone():
            cur.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                display_name TEXT,
                is_admin INTEGER NOT NULL DEFAULT 0
            );
            """)
            conn.commit()


def save_analysis(
    resume_text: str,
    job_text: str,
    score: int,
    matched_skills: List[str] | Any,
    missing_skills: List[str] | Any,
    job_source: str | None = None,
    job_url: str | None = None,
    job_title: str | None = None,
    job_company: str | None = None,
    db_path: str | None = None,
    user_id: int | None = None,
    ) -> int:
    cfg = load_config()
    path = db_path or cfg.db_path
    init_db(path)
    with closing(_connect(path)) as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO analyses (created_at, score, resume_text, job_text, matched_skills, missing_skills, job_source, job_url, job_title, job_company, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                datetime.utcnow().isoformat(timespec="seconds") + "Z",
                int(score),
                resume_text,
                job_text,
                json.dumps(sorted(list(matched_skills))),
                json.dumps(sorted(list(missing_skills))),
                job_source,
                job_url,
                job_title,
                job_company,
                user_id,
            ),
        )
        conn.commit()
        return int(cur.lastrowid)


def fetch_recent(limit: int = 10, db_path: str | None = None, user_id: int | None = None) -> List[Dict[str, Any]]:
    cfg = load_config()
    path = db_path or cfg.db_path
    init_db(path)
    with closing(_connect(path)) as conn:
        cur = conn.cursor()
        if user_id is not None:
            cur.execute(
                "SELECT id, created_at, score, matched_skills, missing_skills, job_title, job_company FROM analyses WHERE user_id = ? ORDER BY id DESC LIMIT ?",
                (int(user_id), int(limit)),
            )
        else:
            cur.execute(
                "SELECT id, created_at, score, matched_skills, missing_skills, job_title, job_company FROM analyses ORDER BY id DESC LIMIT ?",
                (int(limit),),
            )
        rows = cur.fetchall()
    results: List[Dict[str, Any]] = []
    for rid, created_at, score, matched_json, missing_json, job_title, job_company in rows:
        try:
            matched = json.loads(matched_json)
            missing = json.loads(missing_json)
        except Exception:
            matched, missing = [], []
        results.append(
            {
                "id": rid,
                "created_at": created_at,
                "score": score,
                "matched_skills": matched,
                "missing_skills": missing,
                "job_title": job_title,
                "job_company": job_company,
            }
        )
    return results


def fetch_by_id(row_id: int, db_path: str | None = None) -> Dict[str, Any] | None:
    cfg = load_config()
    path = db_path or cfg.db_path
    init_db(path)
    with closing(_connect(path)) as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, created_at, score, resume_text, job_text, matched_skills, missing_skills, job_source, job_url, job_title, job_company FROM analyses WHERE id = ?",
            (int(row_id),),
        )
        row = cur.fetchone()
    if not row:
        return None
    (
        rid,
        created_at,
        score,
        resume_text,
        job_text,
        matched_json,
        missing_json,
        job_source,
        job_url,
        job_title,
        job_company,
    ) = row
    try:
        matched = json.loads(matched_json)
        missing = json.loads(missing_json)
    except Exception:
        matched, missing = [], []
    return {
        "id": rid,
        "created_at": created_at,
        "score": score,
        "resume_text": resume_text or "",
        "job_text": job_text or "",
        "matched_skills": matched,
        "missing_skills": missing,
        "job_source": job_source,
        "job_url": job_url,
        "job_title": job_title,
        "job_company": job_company,
    }


# User helpers

def _row_to_user(row: tuple | None) -> Dict[str, Any] | None:
    if not row:
        return None
    uid, username, password_hash, display_name, is_admin = row
    return {
        "id": int(uid),
        "username": str(username),
        "password_hash": str(password_hash),
        "display_name": display_name,
        "is_admin": bool(is_admin),
    }


def get_user_by_username(username: str, db_path: str | None = None) -> Dict[str, Any] | None:
    cfg = load_config()
    path = db_path or cfg.db_path
    init_db(path)
    with closing(_connect(path)) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, username, password_hash, display_name, is_admin FROM users WHERE username = ?", (username,))
        return _row_to_user(cur.fetchone())


def get_user_by_id(user_id: int, db_path: str | None = None) -> Dict[str, Any] | None:
    cfg = load_config()
    path = db_path or cfg.db_path
    init_db(path)
    with closing(_connect(path)) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, username, password_hash, display_name, is_admin FROM users WHERE id = ?", (int(user_id),))
        return _row_to_user(cur.fetchone())


def any_user_exists(db_path: str | None = None) -> bool:
    cfg = load_config()
    path = db_path or cfg.db_path
    init_db(path)
    with closing(_connect(path)) as conn:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM users LIMIT 1")
        return cur.fetchone() is not None


def create_user(username: str, password_hash: str, display_name: str | None = None, is_admin: bool = False, db_path: str | None = None) -> int:
    cfg = load_config()
    path = db_path or cfg.db_path
    init_db(path)
    with closing(_connect(path)) as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (username, password_hash, display_name, is_admin) VALUES (?, ?, ?, ?)",
            (username, password_hash, display_name, 1 if is_admin else 0),
        )
        conn.commit()
        return int(cur.lastrowid)


def update_display_name(user_id: int, display_name: str, db_path: str | None = None) -> None:
    cfg = load_config()
    path = db_path or cfg.db_path
    init_db(path)
    with closing(_connect(path)) as conn:
        cur = conn.cursor()
        cur.execute("UPDATE users SET display_name = ? WHERE id = ?", (display_name, int(user_id)))
        conn.commit()


def update_username(user_id: int, new_username: str, db_path: str | None = None) -> None:
    cfg = load_config()
    path = db_path or cfg.db_path
    init_db(path)
    with closing(_connect(path)) as conn:
        cur = conn.cursor()
        try:
            cur.execute("UPDATE users SET username = ? WHERE id = ?", (new_username, int(user_id)))
            conn.commit()
        except sqlite3.IntegrityError:
            # Unique constraint violation
            raise


def update_password_hash(user_id: int, password_hash: str, db_path: str | None = None) -> None:
    cfg = load_config()
    path = db_path or cfg.db_path
    init_db(path)
    with closing(_connect(path)) as conn:
        cur = conn.cursor()
        cur.execute("UPDATE users SET password_hash = ? WHERE id = ?", (password_hash, int(user_id)))
        conn.commit()


def clear_db(db_path: str | None = None) -> None:
    """Dangerous: drop and recreate schema. Only for admin use."""
    cfg = load_config()
    path = db_path or cfg.db_path
    with closing(_connect(path)) as conn:
        cur = conn.cursor()
        cur.execute("DROP TABLE IF EXISTS analyses")
        cur.execute("DROP TABLE IF EXISTS users")
        conn.commit()
    init_db(path)
