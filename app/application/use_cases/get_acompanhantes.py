"""GetAcompanhantesUseCase — list registered caregivers for selection."""
from __future__ import annotations

from app.interfaces.repositories.acompanhante_repository import (
    AcompanhanteListItem,
    AcompanhanteRepository,
)


class GetAcompanhantesUseCase:
    def __init__(self, acompanhantes: AcompanhanteRepository) -> None:
        self._acompanhantes = acompanhantes

    async def execute(self) -> list[AcompanhanteListItem]:
        return await self._acompanhantes.list_all()
