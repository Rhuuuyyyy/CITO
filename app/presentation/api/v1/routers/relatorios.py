"""HTTP router for clinical reports (Config → Relatórios)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.get_relatorio_avaliacoes import (
    GetRelatorioAvaliacoesUseCase,
)
from app.db.database import get_db_session
from app.interfaces.api.dependencies import AuthenticatedDoctor, get_current_doctor
from app.interfaces.repositories.relatorio_repository import RelatorioRepository
from app.presentation.api.v1.masking import mask_name
from app.presentation.api.v1.schemas.relatorio import RelatorioAvaliacaoSchema

router = APIRouter(prefix="/relatorios", tags=["Relatórios"])


@router.get(
    "/avaliacoes",
    response_model=list[RelatorioAvaliacaoSchema],
    summary="Avaliações finalizadas do médico (para gráficos e relatórios)",
)
async def list_relatorio_avaliacoes(
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
    session: AsyncSession = Depends(get_db_session),
) -> list[RelatorioAvaliacaoSchema]:
    use_case = GetRelatorioAvaliacoesUseCase(relatorios=RelatorioRepository(session))
    items = await use_case.execute(usuario_id=doctor.usuario_id)
    return [
        RelatorioAvaliacaoSchema(
            data_avaliacao=i.data_avaliacao,
            score_final=i.score_final,
            sexo=i.sexo,
            nome_masked=mask_name(i.nome),
        )
        for i in items
    ]
