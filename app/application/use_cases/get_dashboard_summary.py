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