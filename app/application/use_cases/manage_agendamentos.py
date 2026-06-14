from __future__ import annotations

from datetime import datetime

from app.core.exceptions import NotFoundError
from app.interfaces.repositories.agendamento_repository import (
    AgendamentoItem,
    AgendamentoRepository,
)


class UpdateAgendamentoUseCase:
    def __init__(self, agendamentos: AgendamentoRepository) -> None:
        self._agendamentos = agendamentos

    async def execute(
        self,
        *,
        agendamento_id: int,
        usuario_id: int,
        titulo: str,
        tipo: str | None,
        data_hora: datetime,
        status: str,
    ) -> AgendamentoItem:
        updated = await self._agendamentos.update(
            agendamento_id=agendamento_id,
            usuario_id=usuario_id,
            titulo=titulo,
            tipo=tipo,
            data_hora=data_hora,
            status=status,
        )
        if updated is None:
            raise NotFoundError("Agendamento não encontrado.")
        return updated


class DeleteAgendamentoUseCase:
    def __init__(self, agendamentos: AgendamentoRepository) -> None:
        self._agendamentos = agendamentos

    async def execute(self, *, agendamento_id: int, usuario_id: int) -> None:
        removed = await self._agendamentos.delete(
            agendamento_id=agendamento_id,
            usuario_id=usuario_id,
        )
        if not removed:
            raise NotFoundError("Agendamento não encontrado.")
