from __future__ import annotations

from app.interfaces.repositories.avaliacao_repository import AvaliacaoRepository


class DeleteAvaliacaoUseCase:

    def __init__(self, avaliacoes: AvaliacaoRepository) -> None:
        self._avaliacoes = avaliacoes

    async def execute(
        self, *, avaliacao_id: int, usuario_id: int, is_admin: bool
    ) -> bool:
        return await self._avaliacoes.delete_cascade(
            avaliacao_id=avaliacao_id,
            usuario_id=usuario_id,
            is_admin=is_admin,
        )
