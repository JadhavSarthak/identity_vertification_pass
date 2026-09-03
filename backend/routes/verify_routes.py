"""
verify_routes.py — Public DID verification endpoint.

This endpoint is intentionally minimal: it returns ONLY the holder's name,
verification status, and verification date.  It NEVER leaks DOB, email,
address, phone, or document path.
"""

from datetime import datetime, timezone

from flask import Blueprint, jsonify

from models import get_db

verify_bp = Blueprint("verify", __name__)


@verify_bp.route("/api/verify/<did>", methods=["GET"])
def verify(did):
    """
    Public endpoint — look up a Digital Identity ID.

    Returns only: { found, name, status, verified_at }
    """
    did_clean = did.strip().upper()
    db = get_db()
    try:
        row = db.execute("""
            SELECT
                u.name,
                i.verification_status,
                i.verified_at
            FROM identities i
            JOIN users u ON u.user_id = i.user_id
            WHERE UPPER(i.did) = ?
        """, (did_clean,)).fetchone()

        # Log the verify check (regardless of outcome)
        identity_row = db.execute(
            "SELECT identity_id FROM identities WHERE UPPER(did) = ?", (did_clean,)
        ).fetchone()


        now = datetime.now(timezone.utc).isoformat()
        db.execute(
            "INSERT INTO verification_logs (identity_id, verified_by, action, result, timestamp) VALUES (?, NULL, 'verify_check', ?, ?)",
            (
                identity_row["identity_id"] if identity_row else None,
                "found" if row and row["verification_status"] == "verified" else "not_found",
                now,
            ),
        )
        db.commit()

        if not row or row["verification_status"] != "verified":
            return jsonify({
                "found": False,
                "name": None,
                "status": "not_verified",
                "verified_at": None,
            })

        return jsonify({
            "found": True,
            "name": row["name"],
            "status": row["verification_status"],
            "verified_at": row["verified_at"],
        })
    finally:
        db.close()
