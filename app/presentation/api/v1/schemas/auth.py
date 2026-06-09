"""Response schemas for authentication endpoints."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class TokenLoginResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    access_token: str
    token_type: str = "Bearer"
    sessao_id: int
    usuario_id: int