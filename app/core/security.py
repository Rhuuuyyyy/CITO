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

# Default token lifetime: 30 minutes per ADR-008.
_ACCESS_TOKEN_TTL_SECONDS: int = 1800
_ALGORITHM = "HS256"