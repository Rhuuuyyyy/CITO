"""Patient domain entity (subject of FXS evaluation) — v3.0 schema."""
from datetime import UTC, date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

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
    FUNDAMENTAL_INCOMPLETO = "fundamental_incompleto"
    FUNDAMENTAL_COMPLETO = "fundamental_completo"
    MEDIO_INCOMPLETO = "medio_incompleto"
    MEDIO_COMPLETO = "medio_completo"
    SUPERIOR_INCOMPLETO = "superior_incompleto"
    SUPERIOR_COMPLETO = "superior_completo"
    POS_GRADUACAO = "pos_graduacao"
    NAO_INFORMADO = "nao_informado"

class Patient(BaseModel):
    """Person registered for FXS evaluation."""

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    id: UUID = Field(default_factory=uuid4)
    db_id: int | None = Field(default=None, exclude=True)
    cpf: CPFAnnotated | None = None
    full_name: str = Field(min_length=2, max_length=120)
    birth_date: date
    sex_at_birth: SexAtBirth
    family_history_fxs: bool = False
    criado_por_db_id: int = Field(
        ge=1,
        description="FK para usuarios.id (SERIAL do banco)",
    )