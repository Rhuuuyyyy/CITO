"""Request/response schemas for the scheduling (agendamentos) endpoints."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AgendamentoCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    titulo: str = Field(min_length=1, max_length=200)
    tipo: str | None = Field(default=None, max_length=60)
    data_hora: datetime
    status: str = Field(default="confirmado", max_length=30)
    paciente_id: int | None = None


class AgendamentoSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    titulo: str
    tipo: str | None = None
    data_hora: datetime
    status: str
