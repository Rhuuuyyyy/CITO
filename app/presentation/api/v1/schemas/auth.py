"""Response schemas for authentication endpoints."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class TokenLoginResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    access_token: str
    token_type: str = "Bearer"
    sessao_id: int
    usuario_id: int
    tipo: str | None = None
    nome: str | None = None
    crm: str | None = None
    especialidade: str | None = None