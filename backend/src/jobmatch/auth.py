from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any, Dict, Optional


PBKDF_ITER = 100_000
SALT_LEN = 16


def _b64e(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode("utf-8").rstrip("=")


def _b64d(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def hash_password(password: str) -> str:
    salt = os.urandom(SALT_LEN)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF_ITER)
    return f"{_b64e(salt)}${_b64e(dk)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_b64, dk_b64 = stored.split("$", 1)
        salt = _b64d(salt_b64)
        expected = _b64d(dk_b64)
        cand = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF_ITER)
        return hmac.compare_digest(expected, cand)
    except Exception:
        return False


def _get_secret() -> bytes:
    s = os.getenv("AUTH_SECRET_KEY") or os.getenv("OPENAI_API_KEY") or "dev-secret"
    return hashlib.sha256(s.encode("utf-8")).digest()


def create_token(user_id: int, username: str, display_name: Optional[str] = None, ttl_seconds: int = 60 * 60 * 24 * 30) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload: Dict[str, Any] = {
        "sub": int(user_id),
        "usr": username,
        "name": display_name or username,
        "exp": int(time.time()) + int(ttl_seconds),
    }
    h = _b64e(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    p = _b64e(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{h}.{p}".encode("utf-8")
    sig = hmac.new(_get_secret(), signing_input, hashlib.sha256).digest()
    return f"{h}.{p}.{_b64e(sig)}"


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        h_b64, p_b64, s_b64 = token.split(".")
        signing_input = f"{h_b64}.{p_b64}".encode("utf-8")
        sig = _b64d(s_b64)
        expected = hmac.new(_get_secret(), signing_input, hashlib.sha256).digest()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(_b64d(p_b64).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def extract_bearer_token(auth_header: Optional[str]) -> Optional[str]:
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None
