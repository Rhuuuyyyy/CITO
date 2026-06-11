"""GetAcompanhantesUseCase — list registered caregivers for selection."""
from __future__ import annotations

from app.interfaces.repositories.acompanhante_repository import (
    AcompanhanteListItem,
    AcompanhanteRepository,
)


class GetAcompanhantesUseCase:
    def __init__(self, acompanhantes: AcompanhanteRepository) -> None:
        self._acompanhantes = acompanhantes

    async def execute(self, *, usuario_id: int) -> list[AcompanhanteListItem]:
        return await self._acompanhantes.list_by_doctor(usuario_id=usuario_id)
