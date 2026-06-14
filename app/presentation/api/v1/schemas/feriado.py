from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class FeriadoSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data: str
    nome: str
    tipo: str
