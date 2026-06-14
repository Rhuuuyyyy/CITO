from __future__ import annotations

from datetime import datetime

from app.interfaces.repositories.agendamento_repository import (
    AgendamentoItem,
    AgendamentoRepository,
)


class CreateAgendamentoUseCase:
    def __init__(self, agendamentos: AgendamentoRepository) -> None:
        self._agendamentos = agendamentos

    async def execute(
        self,
        *,
        usuario_id: int,
        titulo: str,
        tipo: str | None,
        data_hora: datetime,
        status: str,
        paciente_id: int | None,
    ) -> AgendamentoItem:
        return await self._agendamentos.add(
            usuario_id=usuario_id,
            paciente_id=paciente_id,
            titulo=titulo,
            tipo=tipo,
            data_hora=data_hora,
            status=status,
        )
