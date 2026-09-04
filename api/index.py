"""
Vercel Serverless Function entry point.

Wraps the Flask application as a Vercel-compatible WSGI handler.
Supports hosted PostgreSQL (via DATABASE_URL env var) or SQLite in /tmp.
"""

import os
import sys

# ── Ensure backend directory is in Python Path ────────────────────────
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.join(root_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(1, root_dir)

# ── Environment defaults for Vercel fallback ──────────────────────────
# On Vercel, /tmp is the only writable directory.
os.environ.setdefault("DB_PATH", "/tmp/secureid.db")
os.environ.setdefault("UPLOAD_DIR", "/tmp/uploads")

# Fallback secrets if not set in Vercel environment variables
os.environ.setdefault("JWT_SECRET", "4c27b660279b11ebafe15a8a18cb704deaaa5265ff1b053136d7db3a4f9edb20")
os.environ.setdefault("AES_KEY", "OKjyHeEjUxct2acenVbDmRLEtWRLuf38KLi_HEwEyzA=")
os.environ.setdefault("CORS_ORIGIN", "*")

from app import create_app  # noqa: E402

# Vercel's Python runtime expects a WSGI-callable named `app`
app = create_app()

# Auto-seed on cold start if using SQLite in /tmp
if not os.environ.get("DATABASE_URL"):
    try:
        from seed import seed
        seed()
    except Exception as e:
        print(f"[WARN] Auto-seed skipped: {e}")
