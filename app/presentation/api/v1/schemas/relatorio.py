"""Response schema for the reports endpoint (Config → Relatórios)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RelatorioAvaliacaoSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    avaliacao_id: int
    data_avaliacao: datetime
    score_final: float | None = None
    sexo: str | None = None
    nome_masked: str
    medico: str | None = None
