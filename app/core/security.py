"""JWT token issuance and verification — stdlib HS256.

Architecture note:
  Implements HS256 using Python's standard library only (hmac + hashlib).
  No dependency on python-jose or PyJWT — avoids the system cryptography
  package compatibility issue on this host.
  Sprint 5 can swap this for RS256 by replacing only this file.
"""
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
    """Raised when JWT verification fails for any reason."""


@dataclass(frozen=True)
class TokenClaims:
    """Verified claims extracted from a valid JWT."""

    usuario_id: int    # DB integer PK from 'usuarios.id'
    role: str          # 'doctor' | 'admin'
    sessao_id: int     # FK to tb_log_sessoes.id (claim 'sid')
    exp: float         # expiry as POSIX timestamp


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