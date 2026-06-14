from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class SintomaSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    descricao: str
