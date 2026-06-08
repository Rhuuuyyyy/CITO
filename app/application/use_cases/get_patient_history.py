"""GetPatientHistoryUseCase — fetch evaluation history for one patient.

HTTP-blind: raises domain exceptions, never HTTPException.
RBAC: a doctor can only view history for patients they registered.
"""
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
    """Returns paginated evaluation history for a patient.

    RBAC is enforced at the repository query level (joins on 'pacientes.criado_por').
    An empty result (no items, no error) is legitimate — patient exists but
    has no evaluations yet.
    """

    def __init__(self, avaliacoes: AvaliacaoReadRepository) -> None:
        self._avaliacoes = avaliacoes

    async def execute(
        self,
        *,
        paciente_id: int,
        usuario_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> PatientHistoryResult:
        """Fetch paginated evaluation history.

        Args:
            paciente_id: The patient whose history to fetch.
            usuario_id: The authenticated doctor's DB integer id.
                        Only evaluations belonging to this doctor's patients
                        are returned (RBAC enforced in the query).
            limit: Page size (max 200 enforced here).
            offset: Pagination offset.

        Returns:
            PatientHistoryResult with items list and total count.
        """
        if limit > 200:
            limit = 200

        total = await self._avaliacoes.count_by_paciente(
            paciente_id=paciente_id,
            usuario_id=usuario_id,
        )
        items = await self._avaliacoes.list_by_paciente(
            paciente_id=paciente_id,
            usuario_id=usuario_id,
            limit=limit,
            offset=offset,
        )
        return PatientHistoryResult(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
        )