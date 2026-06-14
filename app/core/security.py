from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass

from app.core.config import get_settings

_settings = get_settings()

_ACCESS_TOKEN_TTL_SECONDS: int = 1800
_ALGORITHM = "HS256"

class JWTError(Exception):
    pass


@dataclass(frozen=True)
class TokenClaims:

    usuario_id: int
    role: str
    sessao_id: int
    exp: float


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    return base64.urlsafe_b64decode(s + "=" * padding)


def _sign(message: str, secret: str) -> str:
    sig = hmac.new(
        secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return _b64url_encode(sig)


def issue_access_token(
    *,
    usuario_id: int,
    role: str,
    sessao_id: int,
    ttl_seconds: int = _ACCESS_TOKEN_TTL_SECONDS,
) -> str:
    now = time.time()
    header = _b64url_encode(
        json.dumps(
            {"alg": _ALGORITHM, "typ": "JWT"},
            separators=(",", ":"),
        ).encode()
    )
    payload = _b64url_encode(
        json.dumps(
            {
                "sub": str(usuario_id),
                "role": role,
                "sid": sessao_id,
                "iat": int(now),
                "exp": int(now + ttl_seconds),
            },
            separators=(",", ":"),
        ).encode()
    )
    message = f"{header}.{payload}"
    signature = _sign(message, _settings.secret_key)
    return f"{message}.{signature}"


def verify_access_token(token: str) -> TokenClaims:
    parts = token.split(".")
    if len(parts) != 3:
        raise JWTError("Malformed JWT: expected 3 parts")

    header, payload_b64, signature = parts
    message = f"{header}.{payload_b64}"
    expected_sig = _sign(message, _settings.secret_key)

    if not hmac.compare_digest(signature, expected_sig):
        raise JWTError("JWT signature verification failed")

    try:
        claims_raw = json.loads(_b64url_decode(payload_b64))
    except Exception as exc:
        raise JWTError("JWT payload decode failed") from exc

    exp = claims_raw.get("exp")
    if exp is None or time.time() > float(exp):
        raise JWTError("JWT has expired or missing exp claim")

    usuario_id_raw = claims_raw.get("sub")
    role = claims_raw.get("role")
    sessao_id = claims_raw.get("sid")

    if not all([usuario_id_raw, role, sessao_id]):
        raise JWTError("Missing required claims in token")

    return TokenClaims(
        usuario_id=int(str(usuario_id_raw)),
        role=str(role),
        sessao_id=int(str(sessao_id)),
        exp=float(exp),
    )