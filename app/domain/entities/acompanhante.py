"""Acompanhante domain entity — legal guardian or caregiver of a patient."""
from pydantic import BaseModel, ConfigDict, Field

from app.domain.value_objects.cpf import CPFAnnotated


class Acompanhante(BaseModel):
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    # Integer SERIAL id from the DB. None until persisted (set by the repository).
    id: int | None = None
    nome: str = Field(min_length=2, max_length=120)
    cpf: CPFAnnotated | None = None
    telefone: str | None = None
    email: str | None = None

    @property
    def cpf_hash(self) -> str | None:
        return self.cpf.sha256_hex if self.cpf is not None else None
