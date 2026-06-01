from enum import StrEnum # Para criar uma lista de valores aceitávels e traduzir maiúsculas <-> minúsculas.
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

class SymptomCategory(StrEnum): # O JSON dado pelo Frontend sempre vem com valores em minúsculo. O ENUM traduz.
    PHYSICAL = "physical"
    BEHAVIORAL = "behavioral"
    COGNITIVE = "cognitive"
    FAMILY_HISTORY = "family_history"

class AgeRelevance(StrEnum):
    PEDIATRIC = "pediatric"
    ADULT = "adult"
    ANY = "any"
    