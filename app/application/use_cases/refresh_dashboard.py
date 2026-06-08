"""RefreshDashboardUseCase — triggers a non-blocking refresh of the materialized view.

Admin-only operation. The router guards this with role == 'admin'.
"""
from __future__ import annotations

from app.interfaces.repositories.dashboard_repository import DashboardRepository


class RefreshDashboardUseCase:
    """Triggers REFRESH MATERIALIZED VIEW CONCURRENTLY vw_dashboard_anonimizado.

    This is an administrative operation. Only users with role 'admin'
    should be able to call this — enforced in the router via the inline
    role check on the AuthenticatedDoctor.
    """

    def __init__(self, dashboard: DashboardRepository) -> None:
        self._dashboard = dashboard

    async def execute(self) -> None:
        """Trigger the materialized view refresh.

        Uses CONCURRENTLY so the view remains queryable during the refresh.
        The DBA team is responsible for ensuring the required unique index exists.
        """
        await self._dashboard.refresh_materialized_view()