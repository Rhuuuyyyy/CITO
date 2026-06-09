"""GetRelatorioAvaliacoesUseCase — finalised evaluations for the reports view."""
from __future__ import annotations

from app.interfaces.repositories.relatorio_repository import (
    RelatorioAvaliacaoItem,
    RelatorioRepository,
)


class GetRelatorioAvaliacoesUseCase:
    def __init__(self, relatorios: RelatorioRepository) -> None:
        self._relatorios = relatorios

    async def execute(self, *, usuario_id: int) -> list[RelatorioAvaliacaoItem]:
        return await self._relatorios.list_finalizadas(usuario_id=usuario_id)
