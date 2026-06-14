from __future__ import annotations

from dataclasses import dataclass

from app.core.exceptions import LGPDComplianceError
from app.interfaces.repositories.dashboard_repository import (
    DashboardRepository,
    DashboardRow,
)

K_ANONYMITY_THRESHOLD: int = 5


@dataclass(frozen=True)
class DashboardStatsResult:
    rows: list[DashboardRow]
    total_rows: int


class GetDashboardStatsUseCase:

    def __init__(self, dashboard: DashboardRepository) -> None:
        self._dashboard = dashboard

    async def execute(
        self,
        *,
        uf: str | None = None,
        sexo: str | None = None,
        etnia: str | None = None,
    ) -> DashboardStatsResult:
        rows = await self._dashboard.get_stats(uf=uf, sexo=sexo, etnia=etnia)

        for row in rows:
            if row.total_avaliacoes < K_ANONYMITY_THRESHOLD:
                raise LGPDComplianceError(
                    f"Dashboard result would expose a group with fewer than "
                    f"{K_ANONYMITY_THRESHOLD} evaluations. Response suppressed "
                    f"to protect patient privacy (LGPD Art. 12, k-anonymity)."
                )

        return DashboardStatsResult(rows=rows, total_rows=len(rows))