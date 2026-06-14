from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class AcompanhanteCreateRequest(BaseModel):

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    nome: str = Field(min_length=2, max_length=120)
    relacao: str = Field(
        min_length=1, max_length=40,
        description="Grau de parentesco/relação com o paciente (ex.: Mãe, Pai).",
    )
    cpf: str | None = Field(default=None, min_length=11, max_length=14)
    telefone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=254)


class PatientCreateRequest(BaseModel):

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    nome: str = Field(min_length=2, max_length=120)
    cpf: str | None = Field(default=None, min_length=11, max_length=14)
    data_nascimento: date
    sexo: str = Field(pattern="^(M|F|I)$")
    etnia: str | None = None
    telefone: str | None = Field(default=None, max_length=20)
    municipio_residencia: str | None = Field(default=None, max_length=120)
    uf_residencia: str | None = Field(default=None, max_length=2)
    prematuro: bool = False
    escolaridade: str | None = None
    tem_diagnostico_autismo: bool = False
    tem_diagnostico_tdah: bool = False
    outras_comorbidades: str | None = None
    medicamentos_uso: str | None = None
    diagnostico_confirmado_fxs: bool = False
    acompanhante: AcompanhanteCreateRequest | None = None


class PatientUpdateRequest(BaseModel):

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    nome: str = Field(min_length=2, max_length=120)
    cpf: str | None = Field(default=None, min_length=11, max_length=14)
    data_nascimento: date
    sexo: str = Field(pattern="^(M|F|I)$")
    etnia: str | None = None
    telefone: str | None = Field(default=None, max_length=20)
    municipio_residencia: str | None = Field(default=None, max_length=120)
    uf_residencia: str | None = Field(default=None, max_length=2)
    prematuro: bool = False
    escolaridade: str | None = None
    tem_diagnostico_autismo: bool = False
    tem_diagnostico_tdah: bool = False
    outras_comorbidades: str | None = None
    medicamentos_uso: str | None = None
    diagnostico_confirmado_fxs: bool = False


class PatientResponse(BaseModel):

    model_config = ConfigDict(extra="forbid")

    id: int = Field(description="ID (SERIAL) do paciente no banco")
    nome_masked: str = Field(description="Nome com sobrenomes mascarados")
    sexo: str
    etnia: str | None = None
    uf_residencia: str | None = None
    criado_por_db_id: int


class PatientListItemSchema(BaseModel):

    model_config = ConfigDict(extra="forbid")

    id: int
    nome: str = Field(description="Nome mascarado")
    sexo: str | None = None
    data_nascimento: str | None = None
    cpf_masked: str | None = Field(
        default=None, description="Placeholder mascarado (só o hash existe no banco)"
    )
    telefone: str | None = Field(default=None, description="Telefone do acompanhante")
    qtd_acompanhantes: int = Field(default=0, description="Total de acompanhantes do paciente (cadastro + triagens)")
    ultimo_score: float | None = Field(default=None, description="Score da última avaliação finalizada")
    ultima_avaliacao: str | None = Field(default=None, description="Data da última avaliação (YYYY-MM-DD)")
    recomenda_exame: bool | None = Field(
        default=None, description="Status de risco: TRUE = encaminhar para exame"
    )
    ativo: bool = Field(default=True, description="FALSE = paciente arquivado")
    medico: str | None = Field(
        default=None, description="Médico que cadastrou o paciente (visível para admin)"
    )


class PatientSetAtivoRequest(BaseModel):

    model_config = ConfigDict(extra="forbid")

    ativo: bool


class PatientDeleteRequest(BaseModel):

    model_config = ConfigDict(extra="forbid")

    senha: str = Field(min_length=1, max_length=128)


class PatientListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[PatientListItemSchema]
    total: int
    limit: int
    offset: int


class AcompanhanteDetailSchema(BaseModel):

    model_config = ConfigDict(extra="forbid")

    id: int
    nome: str
    relacao: str | None = None
    telefone: str | None = None
    email: str | None = None


class PatientDetailResponse(BaseModel):

    model_config = ConfigDict(extra="forbid")

    id: int
    nome: str
    sexo: str | None = None
    data_nascimento: str | None = None
    idade_anos: int | None = None
    cpf_masked: str | None = None
    etnia: str | None = None
    telefone: str | None = None
    municipio_residencia: str | None = None
    uf_residencia: str | None = None
    prematuro: bool | None = None
    escolaridade: str | None = None
    tem_diagnostico_autismo: bool | None = None
    tem_diagnostico_tdah: bool | None = None
    outras_comorbidades: str | None = None
    medicamentos_uso: str | None = None
    diagnostico_confirmado_fxs: bool | None = None
    acompanhantes: list[AcompanhanteDetailSchema]
