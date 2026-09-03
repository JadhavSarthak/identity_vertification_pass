"""
seed.py — Seed the database with demo data for immediate testing.

Creates:
  1. One admin account:       admin@secureid.gov  / Admin@12345
  2. One pending applicant:   john.doe@example.com / User@12345
  3. One verified applicant:  alice.smith@example.com / User@12345  (DID-2026-000042)

Also creates placeholder document files in uploads/.
"""

import os
import sys

# Ensure we can import from the backend package
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from models import init_db, get_db
from auth import hash_password
from crypto_utils import encrypt

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "uploads"))


def seed():
    init_db()
    db = get_db()

    # Check if already seeded
    existing = db.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    if existing > 0:
        print("Database already seeded — skipping.  Delete secureid.db to re-seed.")
        db.close()
        return

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # ── 1. Admin ──────────────────────────────────────────────────
    db.execute(
        "INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)",
        ("System Administrator", "admin@secureid.gov", hash_password("Admin@12345"), "+91-9000000000", "admin"),
    )
    print("[OK] Admin:  admin@secureid.gov / Admin@12345")

    # ── 2. Pending applicant — John Doe ───────────────────────────
    db.execute(
        "INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)",
        ("John Doe", "john.doe@example.com", hash_password("User@12345"), "+91-9111111111", "user"),
    )
    john_id = db.execute("SELECT user_id FROM users WHERE email='john.doe@example.com'").fetchone()["user_id"]

    db.execute(
        "INSERT INTO identities (user_id, date_of_birth, address, verification_status) VALUES (?, ?, ?, 'pending')",
        (john_id, encrypt("1998-04-15"), encrypt("42 MG Road, Bengaluru 560001")),
    )
    john_identity = db.execute("SELECT identity_id FROM identities WHERE user_id=?", (john_id,)).fetchone()["identity_id"]

    # Create a placeholder document
    john_doc_path = os.path.join(UPLOAD_DIR, "demo_college_id_john.pdf")
    with open(john_doc_path, "w") as f:
        f.write("[DEMO] College ID document for John Doe -- placeholder file for testing.\n")
    db.execute(
        "INSERT INTO documents (user_id, document_type, document_path) VALUES (?, ?, ?)",
        (john_id, "College ID", john_doc_path),
    )

    db.execute(
        "INSERT INTO verification_logs (identity_id, verified_by, action, result) VALUES (?, NULL, 'submitted', 'pending')",
        (john_identity,),
    )
    print("[OK] Pending: john.doe@example.com / User@12345  (College ID)")

    # ── 3. Verified applicant — Alice Smith ───────────────────────
    db.execute(
        "INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)",
        ("Alice Smith", "alice.smith@example.com", hash_password("User@12345"), "+91-9222222222", "user"),
    )
    alice_id = db.execute("SELECT user_id FROM users WHERE email='alice.smith@example.com'").fetchone()["user_id"]

    # Use identity_id = 42 trick: insert with explicit id
    db.execute(
        "INSERT INTO identities (identity_id, user_id, date_of_birth, address, did, verification_status, verified_at) VALUES (42, ?, ?, ?, 'DID-2026-000042', 'verified', '2026-08-28T12:00:00+00:00')",
        (alice_id, encrypt("1995-11-22"), encrypt("7 Park Street, Kolkata 700016")),
    )

    alice_doc_path = os.path.join(UPLOAD_DIR, "demo_passport_alice.pdf")
    with open(alice_doc_path, "w") as f:
        f.write("[DEMO] Passport document for Alice Smith -- placeholder file for testing.\n")
    db.execute(
        "INSERT INTO documents (user_id, document_type, document_path) VALUES (?, ?, ?)",
        (alice_id, "Passport", alice_doc_path),
    )

    db.execute(
        "INSERT INTO verification_logs (identity_id, verified_by, action, result) VALUES (42, 1, 'approved', 'Approved -- DID-2026-000042')",
    )
    print("[OK] Verified: alice.smith@example.com / User@12345  (DID-2026-000042)")

    db.commit()
    db.close()
    print("\n== Seed complete. ==")


if __name__ == "__main__":
    seed()
