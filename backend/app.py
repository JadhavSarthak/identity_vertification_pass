"""
app.py — Flask application factory for SecureID.

Registers blueprints, configures CORS (restricted to frontend origin),
and applies rate-limiting to brute-force-sensitive endpoints.
"""

import os
from dotenv import load_dotenv

# Load .env BEFORE any module reads os.environ
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from models import init_db
from routes.auth_routes import auth_bp
from routes.admin_routes import admin_bp
from routes.verify_routes import verify_bp


def create_app():
    app = Flask(__name__)

    # ── CORS ──────────────────────────────────────────────────────
    cors_origin = os.environ.get("CORS_ORIGIN", "*")
    if cors_origin == "*":
        CORS(app, resources={r"/*": {"origins": "*"}}, allow_headers="*", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    else:
        CORS(app, resources={r"/*": {"origins": [cors_origin]}}, supports_credentials=True, allow_headers="*", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])


    # ── Rate Limiting ─────────────────────────────────────────────
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["200 per hour"],
        storage_uri="memory://",
    )

    # Apply stricter limits to brute-force-sensitive endpoints
    limiter.limit("10 per minute")(auth_bp)     # covers /api/login and /api/register
    limiter.limit("30 per minute")(verify_bp)   # covers /api/verify/<did>

    # ── Blueprints ────────────────────────────────────────────────
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(verify_bp)

    # ── Database ──────────────────────────────────────────────────
    init_db()

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    # NOTE: In production, run behind gunicorn/nginx with TLS.
    # Example: gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
    app.run(debug=True, port=port)
