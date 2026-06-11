"""Request/response schemas for admin user management."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserCreateRequest(BaseModel):
    """Payload para o admin criar um novo médico."""

    model_config = ConfigDict(extra="forbid")

    nome: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=3, max_length=255)
    senha: str = Field(min_length=8, max_length=128)
    crm: str | None = Field(default=None, max_length=50)
    especialidade: str | None = Field(default=None, max_length=120)


class UserSetAtivoRequest(BaseModel):
    """Ativar/desativar uma conta (soft delete)."""

    model_config = ConfigDict(extra="forbid")

    ativo: bool


class UserDeleteRequest(BaseModel):
    """Exclusão definitiva, confirmada com a senha do próprio admin."""

    model_config = ConfigDict(extra="forbid")

    senha_admin: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    nome: str
    email: str
    crm: str | None = None
    especialidade: str | None = None
    tipo: str | None = None
    ativo: bool
    ultimo_acesso: datetime | None = None
