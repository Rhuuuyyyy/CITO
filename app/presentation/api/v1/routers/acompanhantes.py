"""HTTP router for the registered caregivers list."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.create_acompanhante import CreateAcompanhanteUseCase
from app.application.use_cases.get_acompanhantes import GetAcompanhantesUseCase
from app.db.database import get_db_session
from app.interfaces.api.dependencies import AuthenticatedDoctor, get_current_doctor
from app.interfaces.repositories.acompanhante_repository import AcompanhanteRepository
from app.presentation.api.v1.schemas.acompanhante import (
    AcompanhanteCreateRequest,
    AcompanhanteListItemSchema,
)

router = APIRouter(prefix="/acompanhantes", tags=["Acompanhantes"])


@router.get(
    "",
    response_model=list[AcompanhanteListItemSchema],
    summary="Acompanhantes cadastrados",
)
async def list_acompanhantes(
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
    session: AsyncSession = Depends(get_db_session),
) -> list[AcompanhanteListItemSchema]:
    use_case = GetAcompanhantesUseCase(acompanhantes=AcompanhanteRepository(session))
    items = await use_case.execute(usuario_id=doctor.usuario_id)
    return [
        AcompanhanteListItemSchema(
            id=item.id,
            nome=item.nome,
            telefone=item.telefone,
            email=item.email,
        )
        for item in items
    ]


@router.post(
    "",
    response_model=AcompanhanteListItemSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar novo acompanhante",
)
async def create_acompanhante(
    payload: AcompanhanteCreateRequest,
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
    session: AsyncSession = Depends(get_db_session),
) -> AcompanhanteListItemSchema:
    use_case = CreateAcompanhanteUseCase(acompanhantes=AcompanhanteRepository(session))
    novo = await use_case.execute(
        nome=payload.nome,
        telefone=payload.telefone,
        email=payload.email,
        cpf=payload.cpf,
    )
    return AcompanhanteListItemSchema(
        id=novo.id,
        nome=novo.nome,
        telefone=novo.telefone,
        email=novo.email,
    )
