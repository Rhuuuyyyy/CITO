"""Schemas for the caregiver endpoints."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class AcompanhanteListItemSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    nome: str
    telefone: str | None = None
    email: str | None = None


class AcompanhanteCreateRequest(BaseModel):
    """Cadastro de um acompanhante novo (para vincular a uma avaliação)."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    nome: str = Field(min_length=2, max_length=120)
    telefone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=120)
    cpf: str | None = Field(default=None, max_length=14)


class AcompanhanteUpdateRequest(BaseModel):
    """Edição dos dados de contato de um acompanhante existente."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    nome: str = Field(min_length=2, max_length=120)
    telefone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=120)
