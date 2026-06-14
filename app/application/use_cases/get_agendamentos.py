from __future__ import annotations

from app.interfaces.repositories.agendamento_repository import (
    AgendamentoItem,
    AgendamentoRepository,
)


class GetAgendamentosUseCase:
    def __init__(self, agendamentos: AgendamentoRepository) -> None:
        self._agendamentos = agendamentos

    async def execute(self, *, usuario_id: int) -> list[AgendamentoItem]:
        return await self._agendamentos.list_active(usuario_id=usuario_id)
