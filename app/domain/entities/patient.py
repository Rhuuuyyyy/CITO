"""Patient domain entity (subject of FXS evaluation)."""
from datetime import UTC, date, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from app.domain.value_objects.cpf import CPFAnnotated


class SexAtBirth(StrEnum):
    MALE = "M"
    FEMALE = "F"
    INTERSEX = "I"


class Etnia(StrEnum):
    BRANCA = "branca"
    PRETA = "preta"
    PARDA = "parda"
    AMARELA = "amarela"
    INDIGENA = "indigena"
    NAO_DECLARADO = "nao_declarado"


class Escolaridade(StrEnum):
    SEM_ESCOLARIDADE = "sem_escolaridade"
    EDUCACAO_INFANTIL = "educacao_infantil"
    FUNDAMENTAL_INCOMPLETO = "fundamental_incompleto"
    FUNDAMENTAL_COMPLETO = "fundamental_completo"
    MEDIO_INCOMPLETO = "medio_incompleto"
    MEDIO_COMPLETO = "medio_completo"
    SUPERIOR_INCOMPLETO = "superior_incompleto"
    SUPERIOR_COMPLETO = "superior_completo"
    POS_GRADUACAO = "pos_graduacao"
    NAO_INFORMADO = "nao_informado"


class Patient(BaseModel):
    """Person registered for FXS evaluation.

    Identity is the integer SERIAL ``id`` from the ``pacientes`` view. It is
    ``None`` until the repository persists the row and back-fills it.
    """

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    id: int | None = None
    cpf: CPFAnnotated | None = None
    full_name: str = Field(min_length=2, max_length=120)
    birth_date: date
    sex_at_birth: SexAtBirth
    family_history_fxs: bool = False
    criado_por_db_id: int = Field(
        ge=1,
        description="FK para usuarios.id (SERIAL do banco)",
    )

    # Demographic fields — all optional (the registration form does not
    # collect place-of-birth/residence; the DB columns are nullable).
    etnia: Etnia | None = None
    uf_nascimento: str | None = None
    municipio_residencia: str | None = None
    uf_residencia: str | None = None
    prematuro: bool = False
    idade_gestacional_semanas: int | None = None
    peso_nascimento_gramas: float | None = None
    escolaridade: Escolaridade | None = None
    tem_diagnostico_autismo: bool = False
    tem_diagnostico_tdah: bool = False
    outras_comorbidades: str | None = None
    medicamentos_uso: str | None = None
    acompanhante_id: int | None = None
    grau_parentesco: str | None = None
    diagnostico_confirmado_fxs: bool = False

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @property
    def cpf_hash(self) -> str | None:
        return self.cpf.sha256_hex if self.cpf is not None else None

    def age_at(self, reference: date) -> int:
        years = reference.year - self.birth_date.year
        before_birthday = (reference.month, reference.day) < (
            self.birth_date.month,
            self.birth_date.day,
        )
        return years - 1 if before_birthday else years
