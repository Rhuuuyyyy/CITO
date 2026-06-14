from __future__ import annotations

from dataclasses import dataclass

from app.interfaces.repositories.avaliacao_read_repository import (
    AvaliacaoHistoricoItem,
    AvaliacaoReadRepository,
)


@dataclass(frozen=True)
class PatientHistoryResult:
    items: list[AvaliacaoHistoricoItem]
    total: int
    limit: int
    offset: int


class GetPatientHistoryUseCase:

    def __init__(self, avaliacoes: AvaliacaoReadRepository) -> None:
        self._avaliacoes = avaliacoes

    async def execute(
        self,
        *,
        paciente_id: int,
        usuario_id: int,
        limit: int = 50,
        offset: int = 0,
        is_admin: bool = False,
    ) -> PatientHistoryResult:
        if limit > 200:
            limit = 200

        total = await self._avaliacoes.count_by_paciente(
            paciente_id=paciente_id,
            usuario_id=usuario_id,
            is_admin=is_admin,
        )
        items = await self._avaliacoes.list_by_paciente(
            paciente_id=paciente_id,
            usuario_id=usuario_id,
            limit=limit,
            offset=offset,
            is_admin=is_admin,
        )
        return PatientHistoryResult(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
        )