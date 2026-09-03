"""
Vercel Serverless Function entry point.

Wraps the Flask application as a Vercel-compatible WSGI handler.
On every cold start, the database is initialised and seeded with demo data
in /tmp (the only writable directory on Vercel).
"""

import os
import sys

# ── Environment defaults for Vercel ──────────────────────────────────
# On Vercel, /tmp is the only writable directory.
os.environ.setdefault("DB_PATH", "/tmp/secureid.db")
os.environ.setdefault("UPLOAD_DIR", "/tmp/uploads")

# If secrets aren't set via Vercel env vars, use demo defaults
os.environ.setdefault("JWT_SECRET", "4c27b660279b11ebafe15a8a18cb704deaaa5265ff1b053136d7db3a4f9edb20")
os.environ.setdefault("AES_KEY", "OKjyHeEjUxct2acenVbDmRLEtWRLuf38KLi_HEwEyzA=")
os.environ.setdefault("CORS_ORIGIN", "*")

# Add the backend directory to Python path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend")
sys.path.insert(0, backend_dir)

from app import create_app  # noqa: E402

app = create_app()

# ── Auto-seed on cold start ──────────────────────────────────────────
# Vercel's /tmp is ephemeral, so the DB is recreated on each cold start.
# This ensures demo accounts are always available.
try:
    from seed import seed
    seed()
except Exception as e:
    print(f"[WARN] Auto-seed skipped: {e}")
