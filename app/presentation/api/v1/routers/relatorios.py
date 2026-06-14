from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.get_relatorio_avaliacoes import (
    GetRelatorioAvaliacoesUseCase,
)
from app.db.database import get_db_session
from app.interfaces.api.dependencies import AuthenticatedDoctor, get_current_doctor
from app.interfaces.repositories.relatorio_repository import RelatorioRepository
from app.presentation.api.v1.schemas.relatorio import RelatorioAvaliacaoSchema

router = APIRouter(prefix="/relatorios", tags=["Relatórios"])


@router.get(
    "/avaliacoes",
    response_model=list[RelatorioAvaliacaoSchema],
    summary="Avaliações finalizadas (admin: todas; médico: só as suas)",
)
async def list_relatorio_avaliacoes(
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
    session: AsyncSession = Depends(get_db_session),
    data_inicio: str | None = Query(default=None, description="Data inicial (YYYY-MM-DD)"),
    data_fim: str | None = Query(default=None, description="Data final (YYYY-MM-DD)"),
    medico_id: int | None = Query(
        default=None, description="Filtrar por médico (apenas admin; ignorado para médico)"
    ),
    sexo: str | None = Query(default=None, description="Filtrar por sexo (M ou F)"),
) -> list[RelatorioAvaliacaoSchema]:
    if doctor.role == "admin":
        restrict_to = medico_id
    else:
        restrict_to = doctor.usuario_id

    use_case = GetRelatorioAvaliacoesUseCase(relatorios=RelatorioRepository(session))
    items = await use_case.execute(
        restrict_to_usuario_id=restrict_to,
        data_inicio=data_inicio,
        data_fim=data_fim,
        sexo=sexo,
    )
    return [
        RelatorioAvaliacaoSchema(
            avaliacao_id=i.avaliacao_id,
            data_avaliacao=i.data_avaliacao,
            score_final=i.score_final,
            sexo=i.sexo,
            nome_masked=i.nome,
            medico=i.medico,
        )
        for i in items
    ]
