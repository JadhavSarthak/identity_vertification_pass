"""
auth_routes.py — Registration, login, and user profile endpoints.
"""

import os
import uuid
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, g
from werkzeug.utils import secure_filename

from auth import hash_password, check_password, create_token, login_required
from models import get_db
from crypto_utils import encrypt, decrypt

auth_bp = Blueprint("auth", __name__)

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "pdf", "webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def _allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ─── POST /api/register ──────────────────────────────────────────────

@auth_bp.route("/api/register", methods=["POST"])
def register():
    """Create a new user, identity record, and handle document upload."""
    # Extract form fields (multipart because of file upload)
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")
    phone = request.form.get("phone", "").strip()
    dob = request.form.get("date_of_birth", "").strip()
    address = request.form.get("address", "").strip()
    document_type = request.form.get("document_type", "").strip()

    # Validation
    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # Check file
    file = request.files.get("document")
    if not file or file.filename == "":
        return jsonify({"error": "Identity document is required"}), 400
    if not _allowed_file(file.filename):
        return jsonify({"error": f"File type not allowed. Accepted: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    # Read file into memory to check size
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE:
        return jsonify({"error": "File too large (max 5 MB)"}), 400

    db = get_db()
    try:
        # Check duplicate email
        existing = db.execute("SELECT user_id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            return jsonify({"error": "An account with this email already exists"}), 409

        # Hash password
        pw_hash = hash_password(password)

        # Insert user
        cur = db.execute(
            "INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, 'user')",
            (name, email, pw_hash, phone),
        )
        user_id = cur.lastrowid

        # Encrypt sensitive fields
        enc_dob = encrypt(dob) if dob else ""
        enc_address = encrypt(address) if address else ""

        # Insert identity
        cur2 = db.execute(
            "INSERT INTO identities (user_id, date_of_birth, address, verification_status) VALUES (?, ?, ?, 'pending')",
            (user_id, enc_dob, enc_address),
        )
        identity_id = cur2.lastrowid

        # Save uploaded file via storage helper (Cloud / /tmp fallback)
        from storage import save_document
        file_path = save_document(file, file.filename)

        # Insert document record
        db.execute(
            "INSERT INTO documents (user_id, document_type, document_path) VALUES (?, ?, ?)",
            (user_id, document_type, file_path),
        )

        # Audit log
        db.execute(
            "INSERT INTO verification_logs (identity_id, verified_by, action, result) VALUES (?, NULL, 'submitted', 'pending')",
            (identity_id,),
        )

        db.commit()

        return jsonify({
            "message": "Registration submitted — awaiting review",
            "reference_number": f"REF-{identity_id:06d}",
            "identity_id": identity_id,
        }), 201

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


# ─── POST /api/login ─────────────────────────────────────────────────

@auth_bp.route("/api/login", methods=["POST"])
def login():
    """Authenticate and return a JWT with role claim."""
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    db = get_db()
    try:
        user = db.execute(
            "SELECT user_id, name, email, password_hash, role FROM users WHERE email = ?",
            (email,),
        ).fetchone()

        if not user or not check_password(password, user["password_hash"]):
            return jsonify({"error": "Invalid email or password"}), 401

        token = create_token(user["user_id"], user["role"])

        return jsonify({
            "token": token,
            "user": {
                "user_id": user["user_id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
            },
        })
    finally:
        db.close()


# ─── GET /api/me ──────────────────────────────────────────────────────

@auth_bp.route("/api/me", methods=["GET"])
@login_required
def me():
    """Return the logged-in user's identity status."""
    db = get_db()
    try:
        user = db.execute(
            "SELECT user_id, name, email, phone, role, created_at FROM users WHERE user_id = ?",
            (g.user_id,),
        ).fetchone()

        if not user:
            return jsonify({"error": "User not found"}), 404

        identity = db.execute(
            "SELECT identity_id, date_of_birth, address, did, verification_status, created_at, verified_at FROM identities WHERE user_id = ?",
            (g.user_id,),
        ).fetchone()

        identity_data = None
        if identity:
            identity_data = {
                "identity_id": identity["identity_id"],
                "date_of_birth": decrypt(identity["date_of_birth"]) if identity["date_of_birth"] else "",
                "address": decrypt(identity["address"]) if identity["address"] else "",
                "did": identity["did"],
                "verification_status": identity["verification_status"],
                "submitted_at": identity["created_at"],
                "verified_at": identity["verified_at"],
            }

        document = db.execute(
            "SELECT document_id, document_type, uploaded_at FROM documents WHERE user_id = ?",
            (g.user_id,),
        ).fetchone()

        doc_data = None
        if document:
            doc_data = {
                "document_id": document["document_id"],
                "document_type": document["document_type"],
                "uploaded_at": document["uploaded_at"],
            }

        return jsonify({
            "user": {
                "user_id": user["user_id"],
                "name": user["name"],
                "email": user["email"],
                "phone": user["phone"],
                "role": user["role"],
                "created_at": user["created_at"],
            },
            "identity": identity_data,
            "document": doc_data,
        })
    finally:
        db.close()
