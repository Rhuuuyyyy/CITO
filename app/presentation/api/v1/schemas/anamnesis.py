from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RespostaSintomaSchema(BaseModel):

    model_config = ConfigDict(extra="forbid")

    sintoma_id: int = Field(ge=1, description="ID do sintoma na tabela sintomas")
    presente: bool = Field(description="True = sintoma presente no paciente")
    observacao: str = Field(
        default="",
        max_length=500,
        description="Observação clínica opcional do médico sobre este sintoma",
    )


class HistoricoFamiliarSchema(BaseModel):

    model_config = ConfigDict(extra="forbid")

    deficiencia_intelectual: bool = False
    falencia_ovariana_precoce: bool = False
    autismo_na_familia: bool = False
    epilepsia: bool = False
    infertilidade_masculina: bool = False
    menopausa_precoce: bool = False
    abortos_recorrentes: bool = False
    tremor_ataxia_familiar: bool = False
    descricao_outros: str | None = Field(default=None, max_length=500)


class SubmitAnamnesisRequest(BaseModel):

    model_config = ConfigDict(extra="forbid")

    paciente_id: int = Field(ge=1, description="ID do paciente no banco")
    sessao_id: int = Field(ge=1, description="ID da sessão ativa do médico")
    acompanhante_id: int | None = Field(
        default=None, description="Acompanhante presente nesta avaliação (modelo B)"
    )
    grau_parentesco: str | None = Field(
        default=None, max_length=40,
        description="Relação do acompanhante com o paciente nesta avaliação",
    )
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
    historico_familiar: HistoricoFamiliarSchema = Field(
        default_factory=HistoricoFamiliarSchema,
        description="Histórico familiar do paciente (achados hereditários)",
    )


class AvaliacaoResponse(BaseModel):

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


class SintomaRespostaDetalheSchema(BaseModel):

    model_config = ConfigDict(extra="forbid")

    descricao: str
    presente: bool


class AvaliacaoDetalheResponse(BaseModel):

    model_config = ConfigDict(extra="forbid")

    avaliacao_id: int
    data_avaliacao: datetime
    score_final: float | None = None
    recomenda_exame: bool | None = None
    paciente_nome: str
    paciente_sexo: str | None = None
    paciente_data_nascimento: str | None = None
    acompanhante_nome: str | None = None
    acompanhante_relacao: str | None = None
    acompanhante_telefone: str | None = None
    acompanhante_email: str | None = None
    sintomas: list[SintomaRespostaDetalheSchema]
    historico_familiar: HistoricoFamiliarSchema | None = None