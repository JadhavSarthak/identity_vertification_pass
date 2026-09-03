"""
models.py — Database connection, schema initialisation, and helper queries.

Uses SQLite for development. The schema is written with standard SQL types
so it can be migrated to PostgreSQL / MySQL with minimal changes (swap
AUTOINCREMENT → SERIAL, TEXT dates → TIMESTAMP, etc.).
"""

import sqlite3
import os

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "secureid.db"))


def get_db():
    """Return a new connection with row-factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Create tables if they do not already exist."""
    conn = get_db()
    cur = conn.cursor()

    cur.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        email         TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone         TEXT,
        role          TEXT DEFAULT 'user',   -- 'user' or 'admin'
        created_at    TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS identities (
        identity_id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id             INTEGER NOT NULL REFERENCES users(user_id),
        date_of_birth       TEXT,          -- AES-encrypted at rest
        address             TEXT,          -- AES-encrypted at rest
        did                 TEXT UNIQUE,   -- e.g. DID-2026-000123, NULL until approved
        verification_status TEXT DEFAULT 'pending',  -- pending / verified / rejected
        created_at          TEXT DEFAULT CURRENT_TIMESTAMP,
        verified_at         TEXT
    );

    CREATE TABLE IF NOT EXISTS documents (
        document_id   INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER NOT NULL REFERENCES users(user_id),
        document_type TEXT,
        document_path TEXT,          -- server-side path only, never exposed via API
        uploaded_at   TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS verification_logs (
        log_id      INTEGER PRIMARY KEY AUTOINCREMENT,
        identity_id INTEGER,
        verified_by INTEGER,         -- admin user_id, NULL for public verify checks
        action      TEXT,            -- 'submitted' / 'approved' / 'rejected' / 'verify_check'
        result      TEXT,
        timestamp   TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()
    conn.close()
