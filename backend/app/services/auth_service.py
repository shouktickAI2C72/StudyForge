"""
Lightweight authentication service using only the Python standard library.

Deliberately avoids external deps (passlib/bcrypt/pyjwt) to maximize install
reliability for the prototype. Provides:
  - PBKDF2-HMAC-SHA256 password hashing with per-user random salt
  - Compact signed tokens (HMAC-SHA256) carrying user id/email + expiry
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Optional, Dict, Any

# In a real deployment this comes from an env var / secret manager.
SECRET_KEY = os.environ.get("STUDYFORGE_SECRET_KEY", "studyforge-dev-secret-key-change-me")
PBKDF2_ITERATIONS = 100_000
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 days


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iterations, salt_hex, hash_hex = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations)
        )
        return hmac.compare_digest(dk.hex(), hash_hex)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Signed token (JWT-style, HS256, no external lib)
# ---------------------------------------------------------------------------
def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_token(user_id: int, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    payload_b64 = _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(SECRET_KEY.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256).digest()
    return f"{payload_b64}.{_b64url(signature)}"


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload_b64, signature_b64 = token.split(".")
        expected = hmac.new(
            SECRET_KEY.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(_b64url(expected), signature_b64):
            return None
        payload = json.loads(_b64url_decode(payload_b64))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None
