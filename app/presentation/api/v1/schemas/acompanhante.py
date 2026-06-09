"""Response schema for the caregiver list endpoint."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class AcompanhanteListItemSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    nome: str
    telefone: str | None = None
    email: str | None = None
