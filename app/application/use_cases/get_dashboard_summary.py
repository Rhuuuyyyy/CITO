"""GetDashboardSummaryUseCase — operational metrics for the doctor's personal dashboard.

Unlike GetDashboardStatsUseCase (which returns anonymised epidemiological
aggregate data with k-anonymity enforcement), this use case returns the
doctor's own operational counts: patients, evaluations, and recommendation
rate. These figures are personal to the authenticated doctor and never
aggregate data from other doctors' patients.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.interfaces.repositories.dashboard_repository import (
    DashboardRepository,
    DashboardSummary,
)


@dataclass(frozen=True)
class DashboardSummaryResult:
    total_pacientes: int
    avaliacoes_hoje: int
    avaliacoes_semana: int
    taxa_recomendacao_exame: float | None


class GetDashboardSummaryUseCase:
    """Returns operational dashboard metrics for one authenticated doctor.

    No LGPD k-anonymity guard is required here: the data belongs exclusively
    to the requesting doctor (no cross-doctor aggregation occurs).
    """

    def __init__(self, dashboard: DashboardRepository) -> None:
        self._dashboard = dashboard

    async def execute(
        self, *, usuario_id: int, is_admin: bool = False
    ) -> DashboardSummaryResult:
        summary: DashboardSummary = await self._dashboard.get_summary(
            usuario_id=usuario_id, is_admin=is_admin
        )
        return DashboardSummaryResult(
            total_pacientes=summary.total_pacientes,
            avaliacoes_hoje=summary.avaliacoes_hoje,
            avaliacoes_semana=summary.avaliacoes_semana,
            taxa_recomendacao_exame=summary.taxa_recomendacao_exame,
        )