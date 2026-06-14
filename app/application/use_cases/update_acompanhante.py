from __future__ import annotations

from app.interfaces.repositories.acompanhante_repository import AcompanhanteRepository


class UpdateAcompanhanteUseCase:

    def __init__(self, acompanhantes: AcompanhanteRepository) -> None:
        self._acompanhantes = acompanhantes

    async def execute(
        self,
        *,
        acompanhante_id: int,
        usuario_id: int,
        is_admin: bool,
        nome: str,
        telefone: str | None,
        email: str | None,
    ) -> bool:
        restrict_to = None if is_admin else usuario_id
        return await self._acompanhantes.update(
            acompanhante_id=acompanhante_id,
            nome=nome,
            telefone=telefone,
            email=email,
            restrict_to_usuario_id=restrict_to,
        )
