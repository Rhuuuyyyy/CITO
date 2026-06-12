"""HTTP router for patient history and analytics dashboard."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.get_dashboard_stats import GetDashboardStatsUseCase
from app.application.use_cases.get_dashboard_summary import GetDashboardSummaryUseCase
from app.application.use_cases.get_patient_history import GetPatientHistoryUseCase
from app.application.use_cases.refresh_dashboard import RefreshDashboardUseCase
from app.db.database import get_db_session
from app.interfaces.api.dependencies import AuthenticatedDoctor, get_current_doctor
from app.interfaces.repositories.avaliacao_read_repository import AvaliacaoReadRepository
from app.interfaces.repositories.dashboard_repository import DashboardRepository
from app.presentation.api.v1.schemas.history import (
    AvaliacaoHistoricoSchema,
    DashboardRowSchema,
    DashboardStatsResponse,
    DashboardSummaryResponse,
    PatientHistoryResponse,
)

router = APIRouter(tags=["Histórico & Dashboard"])


@router.get(
    "/pacientes/{paciente_id}/historico",
    response_model=PatientHistoryResponse,
    summary="Histórico de avaliações de um paciente",
)
async def get_patient_history(
    paciente_id: int,
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
    session: AsyncSession = Depends(get_db_session),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> PatientHistoryResponse:
    use_case = GetPatientHistoryUseCase(
        avaliacoes=AvaliacaoReadRepository(session)
    )
    result = await use_case.execute(
        paciente_id=paciente_id,
        usuario_id=doctor.usuario_id,
        limit=limit,
        offset=offset,
        is_admin=(doctor.role == "admin"),
    )
    return PatientHistoryResponse(
        paciente_id=paciente_id,
        items=[
            AvaliacaoHistoricoSchema(
                avaliacao_id=item.avaliacao_id,
                data_avaliacao=item.data_avaliacao,
                score_final=item.score_final,
                recomenda_exame=item.recomenda_exame,
            )
            for item in result.items
        ],
        total=result.total,
        limit=result.limit,
        offset=result.offset,
    )


@router.get(
    "/dashboard/summary",
    response_model=DashboardSummaryResponse,
    summary="Resumo operacional do médico autenticado",
)
async def get_dashboard_summary(
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
    session: AsyncSession = Depends(get_db_session),
) -> DashboardSummaryResponse:
    use_case = GetDashboardSummaryUseCase(
        dashboard=DashboardRepository(session)
    )
    result = await use_case.execute(
        usuario_id=doctor.usuario_id,
        is_admin=(doctor.role == "admin"),
    )
    return DashboardSummaryResponse(
        total_pacientes=result.total_pacientes,
        avaliacoes_hoje=result.avaliacoes_hoje,
        avaliacoes_semana=result.avaliacoes_semana,
        taxa_recomendacao_exame=result.taxa_recomendacao_exame,
    )


@router.get(
    "/dashboard/stats",
    response_model=DashboardStatsResponse,
    summary="Estatísticas anonimizadas (k-anonymity LGPD)",
)
async def get_dashboard_stats(
    uf: str | None = Query(default=None, description="Filtrar por UF (ex: SP)"),
    sexo: str | None = Query(default=None, pattern="^(M|F|I)$"),
    etnia: str | None = Query(default=None),
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
    session: AsyncSession = Depends(get_db_session),
) -> DashboardStatsResponse:
    use_case = GetDashboardStatsUseCase(
        dashboard=DashboardRepository(session)
    )
    result = await use_case.execute(uf=uf, sexo=sexo, etnia=etnia)
    return DashboardStatsResponse(
        rows=[
            DashboardRowSchema(
                sintoma=row.sintoma,
                sexo=row.sexo,
                idade_anos=row.idade_anos,
                etnia=row.etnia,
                uf_residencia=row.uf_residencia,
                total_avaliacoes=row.total_avaliacoes,
                total_presentes=row.total_presentes,
                prevalencia_pct=row.prevalencia_pct,
                versao_parametro=row.versao_parametro,
            )
            for row in result.rows
        ],
        total_rows=result.total_rows,
        k_anonymity_threshold=5,
    )


@router.post(
    "/dashboard/refresh",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Atualizar view materializada do dashboard (admin)",
)
async def refresh_dashboard(
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    if doctor.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem atualizar o dashboard.",
        )
    use_case = RefreshDashboardUseCase(dashboard=DashboardRepository(session))
    await use_case.execute()