from __future__ import annotations

from app.interfaces.repositories.dashboard_repository import DashboardRepository


class RefreshDashboardUseCase:

    def __init__(self, dashboard: DashboardRepository) -> None:
        self._dashboard = dashboard

    async def execute(self) -> None:
        await self._dashboard.refresh_materialized_view()