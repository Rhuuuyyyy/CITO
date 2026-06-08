"""Request/response Pydantic schemas for the anamnesis (evaluation) endpoints."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class RespostaSintomaSchema(BaseModel):
    """One symptom answer in the checklist."""

    model_config = ConfigDict(extra="forbid")

    sintoma_id: int = Field(ge=1, description="ID do sintoma na tabela sintomas")
    presente: bool = Field(description="True = sintoma presente no paciente")
    observacao: str = Field(
        default="",
        max_length=500,
        description="Observação clínica opcional do médico sobre este sintoma",
    )


class SubmitAnamnesisRequest(BaseModel):
    """Payload enviado pelo frontend para submeter um checklist clínico."""

    model_config = ConfigDict(extra="forbid")

    paciente_id: int = Field(ge=1, description="ID do paciente no banco")
    sessao_id: int = Field(ge=1, description="ID da sessão ativa do médico")
    observacoes: str = Field(
        default="",
        max_length=2000,
        description="Notas clínicas livres do médico sobre a consulta",
    )
    diagnostico_previo_fxs: bool = Field(
        default=False,
        description=(
            "TRUE = paciente já tem diagnóstico molecular confirmado. "
            "Suprime a recomendação de novo exame, mas o score ainda é calculado."
        ),
    )
    respostas: list[RespostaSintomaSchema] = Field(
        min_length=1,
        description="Lista de respostas para cada sintoma do checklist",
    )


class AvaliacaoResponse(BaseModel):
    """Retorno após submissão e cálculo de score de uma avaliação."""

    model_config = ConfigDict(extra="forbid")

    avaliacao_id: int
    paciente_id: int
    score_final: float = Field(description="Score calculado (ex: 0.89)")
    limiar_usado: float = Field(description="Limiar de decisão aplicado")
    recomenda_exame: bool = Field(
        description="TRUE = sistema recomenda exame genético FMR1"
    )
    versao_param: str = Field(
        description="Versão do modelo científico usado (ex: ROMERO_2025_v1_M)"
    )
    status: str = Field(description="Status da avaliação: 'finalizada' ou 'cancelada'")