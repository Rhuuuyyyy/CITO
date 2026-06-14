from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ChecklistItemDTO:
    sintoma_id: int
    presente: bool
    observacao: str = ""


@dataclass(frozen=True)
class HistoricoFamiliarDTO:

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
    acompanhante_id: int | None = None
    grau_parentesco: str | None = None
    respostas: list[ChecklistItemDTO] = field(default_factory=list)
    historico_familiar: HistoricoFamiliarDTO = field(default_factory=HistoricoFamiliarDTO)
