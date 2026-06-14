from typing import Protocol
from uuid import UUID

from app.domain.entities.symptom import Symptom, SymptomCategory


class ISymptomRepository(Protocol):

    async def get(self, symptom_id: UUID) -> Symptom | None: ...

    async def get_by_code(self, code: str) -> Symptom | None: ...

    async def list_active(self) -> list[Symptom]: ...

    async def list_by_category(
        self, category: SymptomCategory
    ) -> list[Symptom]: ...

    async def add(self, symptom: Symptom) -> Symptom: ...

    async def update(self, symptom: Symptom) -> Symptom: ...