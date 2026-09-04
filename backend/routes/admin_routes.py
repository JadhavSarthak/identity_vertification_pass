"""
admin_routes.py — Admin-only endpoints for reviewing applications and audit logs.
"""

import os
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, g, send_file

from auth import admin_required
from models import get_db
from crypto_utils import decrypt

admin_bp = Blueprint("admin", __name__)


# ─── GET /api/admin/queue ────────────────────────────────────────────

@admin_bp.route("/api/admin/queue", methods=["GET"])
@admin_required
def get_queue():
    """List all pending identity applications for admin review."""
    db = get_db()
    try:
        rows = db.execute("""
            SELECT
                i.identity_id,
                u.user_id,
                u.name,
                u.email,
                u.phone,
                i.date_of_birth,
                i.address,
                i.verification_status,
                i.created_at AS submitted_at,
                d.document_id,
                d.document_type,
                d.uploaded_at
            FROM identities i
            JOIN users u ON u.user_id = i.user_id
            LEFT JOIN documents d ON d.user_id = u.user_id
            WHERE i.verification_status = 'pending'
            ORDER BY i.created_at ASC
        """).fetchall()

        queue = []
        for r in rows:
            queue.append({
                "identity_id": r["identity_id"],
                "user_id": r["user_id"],
                "name": r["name"],
                "email": r["email"],
                "phone": r["phone"],
                "date_of_birth": decrypt(r["date_of_birth"]) if r["date_of_birth"] else "",
                "address": decrypt(r["address"]) if r["address"] else "",
                "verification_status": r["verification_status"],
                "submitted_at": r["submitted_at"],
                "document_id": r["document_id"],
                "document_type": r["document_type"],
                "uploaded_at": r["uploaded_at"],
            })

        return jsonify({"queue": queue})
    finally:
        db.close()


# ─── POST /api/admin/decide/<identity_id> ────────────────────────────

@admin_bp.route("/api/admin/decide/<int:identity_id>", methods=["POST"])
@admin_required
def decide(identity_id):
    """Approve or reject an identity application."""
    data = request.get_json(silent=True) or {}
    action = data.get("action", "").lower()

    if action not in ("approve", "reject"):
        return jsonify({"error": "action must be 'approve' or 'reject'"}), 400

    db = get_db()
    try:
        identity = db.execute(
            "SELECT identity_id, verification_status FROM identities WHERE identity_id = ?",
            (identity_id,),
        ).fetchone()

        if not identity:
            return jsonify({"error": "Identity not found"}), 404

        if identity["verification_status"] != "pending":
            return jsonify({"error": f"Identity already {identity['verification_status']}"}), 409

        now = datetime.now(timezone.utc).isoformat()

        if action == "approve":
            # Generate DID: DID-2026-XXXXXX
            did = f"DID-2026-{identity_id:06d}"
            db.execute(
                "UPDATE identities SET verification_status = 'verified', did = ?, verified_at = ? WHERE identity_id = ?",
                (did, now, identity_id),
            )
            result_text = f"Approved — {did}"
        else:
            did = None
            db.execute(
                "UPDATE identities SET verification_status = 'rejected', verified_at = ? WHERE identity_id = ?",
                (now, identity_id),
            )
            result_text = "Rejected"

        # Audit log
        db.execute(
            "INSERT INTO verification_logs (identity_id, verified_by, action, result, timestamp) VALUES (?, ?, ?, ?, ?)",
            (identity_id, g.user_id, action == "approve" and "approved" or "rejected", result_text, now),
        )

        db.commit()

        return jsonify({
            "message": f"Identity {action}d successfully",
            "did": did,
            "verification_status": "verified" if action == "approve" else "rejected",
        })
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


# ─── GET /api/admin/audit ────────────────────────────────────────────

@admin_bp.route("/api/admin/audit", methods=["GET"])
@admin_required
def audit_log():
    """Return all audit / verification log entries."""
    db = get_db()
    try:
        rows = db.execute("""
            SELECT
                vl.log_id,
                vl.identity_id,
                vl.verified_by,
                vl.action,
                vl.result,
                vl.timestamp,
                u.name AS admin_name
            FROM verification_logs vl
            LEFT JOIN users u ON u.user_id = vl.verified_by
            ORDER BY vl.timestamp DESC
        """).fetchall()

        logs = []
        for r in rows:
            logs.append({
                "log_id": r["log_id"],
                "identity_id": r["identity_id"],
                "verified_by": r["verified_by"],
                "admin_name": r["admin_name"] or "System / Public",
                "action": r["action"],
                "result": r["result"],
                "timestamp": r["timestamp"],
            })

        return jsonify({"logs": logs})
    finally:
        db.close()


# ─── GET /api/admin/document/<document_id> ───────────────────────────

@admin_bp.route("/api/admin/document/<int:document_id>", methods=["GET"])
def view_document(document_id):
    """Serve an uploaded document to an authenticated admin.

    Supports JWT both via Authorization header and via ?token= query param
    (needed for iframe / direct browser embedding).
    """
    from auth import decode_token

    # Try Authorization header first, then query param
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    else:
        token = request.args.get("token")

    if not token:
        return jsonify({"error": "Authentication required"}), 401

    payload = decode_token(token)
    if not payload:
        return jsonify({"error": "Invalid or expired token"}), 401
    if payload.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403

    db = get_db()
    try:
        doc = db.execute(
            "SELECT document_path FROM documents WHERE document_id = ?",
            (document_id,),
        ).fetchone()

        if not doc:
            return jsonify({"error": "Document not found"}), 404

        from storage import serve_document
        return serve_document(doc["document_path"])
    finally:
        db.close()

