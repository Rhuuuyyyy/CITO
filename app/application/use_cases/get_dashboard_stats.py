"""GetDashboardStatsUseCase — fetch anonymised statistics with LGPD k-anonymity guard.

LGPD Rule: if ANY row returned has total_avaliacoes < K_ANONYMITY_THRESHOLD, the
entire response is blocked and LGPDComplianceError is raised.
This is k-anonymity enforcement at the application layer.
"""
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
    """Returns anonymised dashboard statistics.

    K-Anonymity policy (Art. 12 LGPD + research protocol):
    If any aggregated row has total_avaliacoes < K_ANONYMITY_THRESHOLD,
    the response is entirely suppressed to prevent re-identification.
    The caller receives a LGPDComplianceError — the router maps this to HTTP 422.
    """

    def __init__(self, dashboard: DashboardRepository) -> None:
        self._dashboard = dashboard

    async def execute(
        self,
        *,
        uf: str | None = None,
        sexo: str | None = None,
        etnia: str | None = None,
    ) -> DashboardStatsResult:
        """Fetch anonymised statistics with optional demographic filters.

        Args:
            uf: Optional UF (state) filter (e.g. 'SP').
            sexo: Optional sex filter ('M', 'F', 'I').
            etnia: Optional ethnicity filter.

        Returns:
            DashboardStatsResult with the anonymised rows.

        Raises:
            LGPDComplianceError: If any row would violate k-anonymity.
        """
        rows = await self._dashboard.get_stats(uf=uf, sexo=sexo, etnia=etnia)

        for row in rows:
            if row.total_avaliacoes < K_ANONYMITY_THRESHOLD:
                raise LGPDComplianceError(
                    f"Dashboard result would expose a group with fewer than "
                    f"{K_ANONYMITY_THRESHOLD} evaluations. Response suppressed "
                    f"to protect patient privacy (LGPD Art. 12, k-anonymity)."
                )

        return DashboardStatsResult(rows=rows, total_rows=len(rows))