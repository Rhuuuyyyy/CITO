from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

class SymptomCategory(StrEnum):
    PHYSICAL = "physical"
    BEHAVIORAL = "behavioral"
    COGNITIVE = "cognitive"
    FAMILY_HISTORY = "family_history"

class AgeRelevance(StrEnum):
    PEDIATRIC = "pediatric"
    ADULT = "adult"
    ANY = "any"
    