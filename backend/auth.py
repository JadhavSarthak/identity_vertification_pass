"""
auth.py — Password hashing, JWT token management, and route decorators.

JWT tokens carry: { user_id, role, exp }
Tokens are expected in the Authorization header as: Bearer <token>
"""

import os
import functools
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from flask import request, jsonify, g

JWT_SECRET = os.environ.get("JWT_SECRET", "CHANGE_ME_BEFORE_PRODUCTION")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24


# ─── Password Hashing ────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Return a bcrypt hash of the given plaintext password."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def check_password(password: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode(), hashed.encode())


# ─── JWT Tokens ───────────────────────────────────────────────────────

def create_token(user_id: int, role: str) -> str:
    """Issue a signed JWT containing user_id and role."""
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    """Decode and verify a JWT.  Returns the payload dict or None."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# ─── Route Decorators ─────────────────────────────────────────────────

def login_required(fn):
    """Decorator: require a valid JWT.  Sets g.user_id and g.role."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or malformed Authorization header"}), 401
        payload = decode_token(auth_header[7:])
        if payload is None:
            return jsonify({"error": "Invalid or expired token"}), 401
        g.user_id = payload["user_id"]
        g.role = payload["role"]
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    """Decorator: require a valid JWT with role == 'admin'."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or malformed Authorization header"}), 401
        payload = decode_token(auth_header[7:])
        if payload is None:
            return jsonify({"error": "Invalid or expired token"}), 401
        if payload.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        g.user_id = payload["user_id"]
        g.role = payload["role"]
        return fn(*args, **kwargs)
    return wrapper


# ─── OTP / MFA Stub ──────────────────────────────────────────────────
# TODO: Integrate OTP-based multi-factor authentication here.
# Suggested approach:
#   1. Generate a TOTP secret per user (pyotp library).
#   2. Store the encrypted secret in a new `user_mfa` table.
#   3. On login, after password check, require a 6-digit TOTP code.
#   4. Provide a QR-code provisioning endpoint for authenticator apps.
#
# def generate_otp_secret(user_id: int) -> str:
#     """Generate and store a new TOTP secret for the user."""
#     raise NotImplementedError("OTP support not yet implemented")
#
# def verify_otp(user_id: int, code: str) -> bool:
#     """Verify a TOTP code for the given user."""
#     raise NotImplementedError("OTP support not yet implemented")
