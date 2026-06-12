"""GetRelatorioAvaliacoesUseCase — finalised evaluations for the reports view."""
from __future__ import annotations

from app.interfaces.repositories.relatorio_repository import (
    RelatorioAvaliacaoItem,
    RelatorioRepository,
)


class GetRelatorioAvaliacoesUseCase:
    def __init__(self, relatorios: RelatorioRepository) -> None:
        self._relatorios = relatorios

    async def execute(
        self,
        *,
        restrict_to_usuario_id: int | None,
        data_inicio: str | None = None,
        data_fim: str | None = None,
        sexo: str | None = None,
    ) -> list[RelatorioAvaliacaoItem]:
        return await self._relatorios.list_finalizadas(
            restrict_to_usuario_id=restrict_to_usuario_id,
            data_inicio=data_inicio,
            data_fim=data_fim,
            sexo=sexo,
        )
