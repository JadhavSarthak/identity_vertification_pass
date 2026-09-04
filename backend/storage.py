"""
storage.py — Cloud object storage and local filesystem helper for uploaded documents.

Supports:
  - Vercel Blob (when BLOB_READ_WRITE_TOKEN is set)
  - Cloudinary (when CLOUDINARY_URL is set)
  - Local Disk / /tmp fallback (when no cloud credentials are provided)
"""

import os
import uuid
import urllib.request
import urllib.parse
import json
from flask import send_file, redirect, jsonify

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "uploads"))


def save_document(file_obj, filename: str) -> str:
    """Save an uploaded file and return either a cloud URL or a local file path."""
    ext = filename.rsplit(".", 1)[1].lower() if "." in filename else "bin"
    unique_filename = f"{uuid.uuid4().hex}.{ext}"

    blob_token = os.environ.get("BLOB_READ_WRITE_TOKEN")
    cloudinary_url = os.environ.get("CLOUDINARY_URL")

    # 1. Vercel Blob Storage
    if blob_token:
        try:
            file_bytes = file_obj.read()
            file_obj.seek(0)
            url = f"https://blob.vercel-storage.com/{unique_filename}"
            req = urllib.request.Request(
                url,
                data=file_bytes,
                headers={
                    "Authorization": f"Bearer {blob_token}",
                    "x-api-version": "7",
                },
                method="PUT"
            )
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
                if "url" in data:
                    return data["url"]
        except Exception as e:
            print(f"[WARN] Vercel Blob upload failed ({e}) — falling back to disk.")

    # 2. Cloudinary
    if cloudinary_url:
        try:
            import cloudinary
            import cloudinary.uploader
            upload_result = cloudinary.uploader.upload(file_obj, public_id=uuid.uuid4().hex)
            if "secure_url" in upload_result:
                return upload_result["secure_url"]
        except Exception as e:
            print(f"[WARN] Cloudinary upload failed ({e}) — falling back to disk.")

    # 3. Local Disk / /tmp Fallback
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    local_path = os.path.join(UPLOAD_DIR, unique_filename)
    file_obj.save(local_path)
    return local_path


def serve_document(document_path: str):
    """Serve a document file (either redirecting to cloud URL or sending local file)."""
    if not document_path:
        return jsonify({"error": "Document path empty"}), 404

    if document_path.startswith("http://") or document_path.startswith("https://"):
        return redirect(document_path)

    if not os.path.isfile(document_path):
        return jsonify({"error": "Document file missing from server"}), 404

    return send_file(document_path, as_attachment=False)
