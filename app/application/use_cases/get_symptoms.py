from __future__ import annotations

from app.interfaces.repositories.symptom_repository import (
    SintomaItem,
    SymptomReadRepository,
)


class GetSymptomsUseCase:

    def __init__(self, symptoms: SymptomReadRepository) -> None:
        self._symptoms = symptoms

    async def execute(self) -> list[SintomaItem]:
        return await self._symptoms.list_active()
