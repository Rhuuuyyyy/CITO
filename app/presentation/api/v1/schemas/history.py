from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AvaliacaoHistoricoSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    avaliacao_id: int
    data_avaliacao: datetime
    score_final: float | None = None
    recomenda_exame: bool | None = None


class PatientHistoryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    paciente_id: int
    items: list[AvaliacaoHistoricoSchema]
    total: int
    limit: int
    offset: int


class DashboardSummaryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_pacientes: int = Field(description="Total de pacientes cadastrados pelo médico")
    avaliacoes_hoje: int = Field(description="Avaliações realizadas hoje")
    avaliacoes_semana: int = Field(description="Avaliações nos últimos 7 dias")
    taxa_recomendacao_exame: float | None = Field(
        description="Proporção de avaliações que recomendaram exame genético (0.0–1.0)."
    )


class DashboardRowSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sintoma: str | None = None
    sexo: str | None = None
    idade_anos: int | None = None
    etnia: str | None = None
    uf_residencia: str | None = None
    total_avaliacoes: int
    total_presentes: int | None = None
    prevalencia_pct: float | None = None
    versao_parametro: str | None = None


class DashboardStatsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rows: list[DashboardRowSchema]
    total_rows: int = Field(description="Número de grupos estatísticos retornados")
    k_anonymity_threshold: int = Field(
        default=5,
        description="Limiar de k-anonimato aplicado.",
    )