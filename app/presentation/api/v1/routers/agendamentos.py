"""HTTP router for scheduling (agendamentos)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.create_agendamento import CreateAgendamentoUseCase
from app.application.use_cases.get_agendamentos import GetAgendamentosUseCase
from app.db.database import get_db_session
from app.interfaces.api.dependencies import AuthenticatedDoctor, get_current_doctor
from app.interfaces.repositories.agendamento_repository import AgendamentoRepository
from app.presentation.api.v1.schemas.agendamento import (
    AgendamentoCreateRequest,
    AgendamentoSchema,
)

router = APIRouter(prefix="/agendamentos", tags=["Agenda"])


@router.get(
    "",
    response_model=list[AgendamentoSchema],
    summary="Listar agendamentos ativos do médico",
)
async def list_agendamentos(
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
    session: AsyncSession = Depends(get_db_session),
) -> list[AgendamentoSchema]:
    use_case = GetAgendamentosUseCase(agendamentos=AgendamentoRepository(session))
    items = await use_case.execute(usuario_id=doctor.usuario_id)
    return [
        AgendamentoSchema(
            id=i.id, titulo=i.titulo, tipo=i.tipo, data_hora=i.data_hora, status=i.status
        )
        for i in items
    ]


@router.post(
    "",
    response_model=AgendamentoSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo agendamento",
)
async def create_agendamento(
    payload: AgendamentoCreateRequest,
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
    session: AsyncSession = Depends(get_db_session),
) -> AgendamentoSchema:
    use_case = CreateAgendamentoUseCase(agendamentos=AgendamentoRepository(session))
    item = await use_case.execute(
        usuario_id=doctor.usuario_id,
        titulo=payload.titulo,
        tipo=payload.tipo,
        data_hora=payload.data_hora,
        status=payload.status,
        paciente_id=payload.paciente_id,
    )
    return AgendamentoSchema(
        id=item.id, titulo=item.titulo, tipo=item.tipo,
        data_hora=item.data_hora, status=item.status,
    )
