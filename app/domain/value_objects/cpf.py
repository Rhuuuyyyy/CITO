import hashlib
import re
from dataclasses import dataclass 
from typing import Annotated 

from pydantic.functional_validators import BeforeValidator 

@dataclass(frozen=True)
class CPF:
    value: str
    def __post_init__(self) -> None:
        cleaned = re.sub(r"[.\-\s]", "", self.value)
        if not cleaned.isdigit() or len(cleaned) != 11: 
            raise ValueError(
                "CPF inválido: deve conter exatamente 11 dígitos numérios"
            )   
        object.__setattr__(self, "value", cleaned)

    @property
    def sha256_hex(self) -> str:
        return hashlib.sha256(self.value.encode()).hexdigest()
    def __repr__(self) -> str:
        return "CPF(***redacted***)"
    def __str__(self) -> str:
        return "***redacted***"
    


def _validate_cpf(v: object) -> CPF:
    if isinstance(v, CPF):
        return v
    if isinstance(v, str):
        return CPF(v)
    raise ValueError("CPF deve ser uma string ou instância de CPF")


CPFAnnotated = Annotated[CPF, BeforeValidator(_validate_cpf)]




