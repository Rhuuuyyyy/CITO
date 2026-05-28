"""CPF value object - one-way hash, never logged."""
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
        