"""
crypto_utils.py — AES encryption / decryption for sensitive PII fields.

Uses the Fernet symmetric cipher from the `cryptography` library.
The AES_KEY environment variable must be a valid Fernet key (base64-encoded
32-byte key).  Generate one with:

    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

import os
from cryptography.fernet import Fernet

_key = os.environ.get("AES_KEY")
if _key:
    _fernet = Fernet(_key.encode())
else:
    # Generate an ephemeral key for development if none is set.
    # A warning is printed so the developer knows to set a real key.
    import warnings
    _generated = Fernet.generate_key()
    _fernet = Fernet(_generated)
    warnings.warn(
        "AES_KEY not set — using an ephemeral key. "
        "Data encrypted in this session will NOT be decryptable after restart. "
        "Set AES_KEY in your .env file.",
        RuntimeWarning,
    )


def encrypt(plaintext: str) -> str:
    """Encrypt a plaintext string and return a base64-encoded ciphertext string."""
    if not plaintext:
        return ""
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt a base64-encoded ciphertext string and return plaintext."""
    if not ciphertext:
        return ""
    return _fernet.decrypt(ciphertext.encode()).decode()
