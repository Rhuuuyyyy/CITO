"""GetEvaluationDetailUseCase — full evaluation for reprinting the laudo PDF."""
from __future__ import annotations

from app.interfaces.repositories.avaliacao_read_repository import (
    AvaliacaoFullDetail,
    AvaliacaoReadRepository,
)


class GetEvaluationDetailUseCase:
    """Returns the complete record of one evaluation, scoped to the doctor.

    Returns None when the evaluation does not exist or was not run on a patient
    registered by the requesting doctor (the router maps None to HTTP 404).
    """

    def __init__(self, avaliacoes: AvaliacaoReadRepository) -> None:
        self._avaliacoes = avaliacoes

    async def execute(
        self,
        *,
        avaliacao_id: int,
        usuario_id: int,
        is_admin: bool = False,
    ) -> AvaliacaoFullDetail | None:
        return await self._avaliacoes.get_full(
            avaliacao_id=avaliacao_id,
            usuario_id=usuario_id,
            is_admin=is_admin,
        )
