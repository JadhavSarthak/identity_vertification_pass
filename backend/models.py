"""
models.py — Database connection, schema initialisation, and helper queries.

Supports both PostgreSQL (when DATABASE_URL is set) and SQLite (for local dev / /tmp fallback).
Provides a unified DB connection wrapper so all routes work seamlessly on both DB engines.
"""

import os
import re
import sqlite3

DATABASE_URL = os.environ.get("DATABASE_URL")
DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "secureid.db"))


class DBCursor:
    def __init__(self, cur, lastrowid=None):
        self.cur = cur
        self._lastrowid = lastrowid

    @property
    def lastrowid(self):
        if self._lastrowid is not None:
            return self._lastrowid
        return getattr(self.cur, "lastrowid", None)

    def fetchone(self):
        return self.cur.fetchone()

    def fetchall(self):
        return self.cur.fetchall()


class DBConnection:
    def __init__(self, is_postgres=False, conn=None):
        self.is_postgres = is_postgres
        self.conn = conn

    def _convert_sql(self, sql: str) -> str:
        if not self.is_postgres:
            return sql
        # Replace SQLite ? positional placeholders with Postgres %s
        return re.sub(r'\?', '%s', sql)

    def execute(self, sql: str, params: tuple = ()):
        conv_sql = self._convert_sql(sql)
        lastrowid = None

        if self.is_postgres:
            cur = self.conn.cursor()
            is_insert = conv_sql.strip().upper().startswith("INSERT")
            if is_insert and "RETURNING" not in conv_sql.upper():
                tbl_match = re.search(r"INSERT\s+INTO\s+([a-zA-Z0-9_]+)", conv_sql, re.IGNORECASE)
                if tbl_match:
                    tbl = tbl_match.group(1).lower()
                    pk_map = {
                        "users": "user_id",
                        "identities": "identity_id",
                        "documents": "document_id",
                        "verification_logs": "log_id"
                    }
                    pk = pk_map.get(tbl)
                    if pk:
                        conv_sql = f"{conv_sql} RETURNING {pk}"

            cur.execute(conv_sql, params)

            if is_insert and "RETURNING" in conv_sql.upper():
                try:
                    res = cur.fetchone()
                    if res:
                        lastrowid = list(res.values())[0]
                except Exception:
                    lastrowid = None

            return DBCursor(cur, lastrowid=lastrowid)
        else:
            cur = self.conn.execute(conv_sql, params)
            return DBCursor(cur, lastrowid=getattr(cur, "lastrowid", None))

    def executescript(self, script: str):
        if self.is_postgres:
            cur = self.conn.cursor()
            cur.execute(script)
            return DBCursor(cur)
        else:
            self.conn.executescript(script)
            return DBCursor(None)

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()


def get_db():
    """Return a wrapped database connection (PostgreSQL if DATABASE_URL is set, else SQLite)."""
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)

        try:
            import psycopg2
            import psycopg2.extras
            conn = psycopg2.connect(db_url, cursor_factory=psycopg2.extras.RealDictCursor)
            return DBConnection(is_postgres=True, conn=conn)
        except Exception as e:
            print(f"[WARN] Failed to connect to PostgreSQL ({e}) — falling back to SQLite.")

    # SQLite Fallback
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return DBConnection(is_postgres=False, conn=conn)


def init_db():
    """Create tables if they do not already exist."""
    conn = get_db()

    if conn.is_postgres:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id       SERIAL PRIMARY KEY,
            name          VARCHAR(255) NOT NULL,
            email         VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            phone         VARCHAR(50),
            role          VARCHAR(50) DEFAULT 'user',
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS identities (
            identity_id         SERIAL PRIMARY KEY,
            user_id             INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            date_of_birth       TEXT,
            address             TEXT,
            did                 VARCHAR(255) UNIQUE,
            verification_status VARCHAR(50) DEFAULT 'pending',
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            verified_at         TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS documents (
            document_id   SERIAL PRIMARY KEY,
            user_id       INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            document_type VARCHAR(100),
            document_path TEXT,
            uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS verification_logs (
            log_id      SERIAL PRIMARY KEY,
            identity_id INTEGER REFERENCES identities(identity_id) ON DELETE SET NULL,
            verified_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
            action      VARCHAR(100),
            result      TEXT,
            timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
    else:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT NOT NULL,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            phone         TEXT,
            role          TEXT DEFAULT 'user',
            created_at    TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS identities (
            identity_id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id             INTEGER NOT NULL REFERENCES users(user_id),
            date_of_birth       TEXT,
            address             TEXT,
            did                 TEXT UNIQUE,
            verification_status TEXT DEFAULT 'pending',
            created_at          TEXT DEFAULT CURRENT_TIMESTAMP,
            verified_at         TEXT
        );

        CREATE TABLE IF NOT EXISTS documents (
            document_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL REFERENCES users(user_id),
            document_type TEXT,
            document_path TEXT,
            uploaded_at   TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS verification_logs (
            log_id      INTEGER PRIMARY KEY AUTOINCREMENT,
            identity_id INTEGER,
            verified_by INTEGER,
            action      TEXT,
            result      TEXT,
            timestamp   TEXT DEFAULT CURRENT_TIMESTAMP
        );
        """)

    conn.commit()
    conn.close()
