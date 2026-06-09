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
class HistoricoFamiliarDTO:
    """Hereditary findings collected once per evaluation (tb_historico_familiar)."""

    deficiencia_intelectual: bool = False
    falencia_ovariana_precoce: bool = False
    autismo_na_familia: bool = False
    epilepsia: bool = False
    infertilidade_masculina: bool = False
    menopausa_precoce: bool = False
    abortos_recorrentes: bool = False
    tremor_ataxia_familiar: bool = False
    descricao_outros: str | None = None


@dataclass(frozen=True)
class SubmitAnamnesisDTO:
    paciente_id: int
    sessao_id: int
    observacoes: str
    diagnostico_previo_fxs: bool
    respostas: list[ChecklistItemDTO] = field(default_factory=list)
    historico_familiar: HistoricoFamiliarDTO = field(default_factory=HistoricoFamiliarDTO)
