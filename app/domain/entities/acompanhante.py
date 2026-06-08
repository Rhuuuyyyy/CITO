"""Acompanhante domain entity — legal guardian or caregiver of a patient."""
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from app.domain.value_objects.cpf import CPFAnnotated


class Acompanhante(BaseModel):
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    id: UUID = Field(default_factory=uuid4)
    nome: str = Field(min_length=2, max_length=120)
    cpf: CPFAnnotated | None = None
    telefone: str = Field(min_length=8, max_length=20)
    email: str = Field(max_length=254)

    @property
    def cpf_hash(self) -> str | None:
        return self.cpf.sha256_hex if self.cpf is not None else None