"""Data Transfer Objects for the anamnesis (evaluation) submission flow.

These DTOs decouple the application use case and outbound adapters from the
HTTP presentation schemas. The HTTP router translates Pydantic schemas into
these DTOs before calling the use case.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ChecklistItemDTO:
    sintoma_id: int
    presente: bool
    observacao: str = ""


@dataclass(frozen=True)
class SubmitAnamnesisDTO:
    paciente_id: int
    sessao_id: int
    observacoes: str
    diagnostico_previo_fxs: bool
    respostas: list[ChecklistItemDTO] = field(default_factory=list)