"""Read-only adapter for the anonymised statistics dashboard."""
from __future__ import annotations

from dataclasses import dataclass
from typing import cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class DashboardRow:
    """One aggregated row from the anonymised dashboard view.

    Columns mirror vw_dashboard_anonimizado (per docs/database_report.md §4.4).
    """

    sintoma: str | None
    sexo: str | None
    idade_anos: int | None
    etnia: str | None
    uf_residencia: str | None
    total_avaliacoes: int
    total_presentes: int | None
    prevalencia_pct: float | None
    versao_parametro: str | None


@dataclass(frozen=True)
class DashboardSummary:
    """Operational summary for the authenticated doctor's personal dashboard."""

    total_pacientes: int
    avaliacoes_hoje: int
    avaliacoes_semana: int
    taxa_recomendacao_exame: float | None


class DashboardRepository:
    """Reads from the vw_dashboard_anonimizado materialised view."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_stats(
        self,
        *,
        uf: str | None = None,
        sexo: str | None = None,
        etnia: str | None = None,
    ) -> list[DashboardRow]:
        conditions = []
        params: dict[str, str] = {}
        if uf:
            conditions.append("uf_residencia = :uf")
            params["uf"] = uf
        if sexo:
            conditions.append("sexo = :sexo")
            params["sexo"] = sexo
        if etnia:
            conditions.append("etnia = :etnia")
            params["etnia"] = etnia

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        result = await self._session.execute(
            text(
                f"""
                SELECT sintoma, sexo, idade_anos, etnia, uf_residencia,
                       total_avaliacoes, total_presentes, prevalencia_pct,
                       versao_parametro
                FROM   vw_dashboard_anonimizado
                {where_clause}
                ORDER  BY total_avaliacoes DESC
                """
            ),
            params,
        )
        rows = result.mappings().all()
        return [
            DashboardRow(
                sintoma=cast("str | None", r["sintoma"]),
                sexo=cast("str | None", r["sexo"]),
                idade_anos=cast("int | None", r["idade_anos"]),
                etnia=cast("str | None", r["etnia"]),
                uf_residencia=cast("str | None", r["uf_residencia"]),
                total_avaliacoes=cast(int, r["total_avaliacoes"]),
                total_presentes=cast("int | None", r["total_presentes"]),
                prevalencia_pct=cast("float | None", r["prevalencia_pct"]),
                versao_parametro=cast("str | None", r["versao_parametro"]),
            )
            for r in rows
        ]

    async def get_summary(self, *, usuario_id: int) -> DashboardSummary:
        result = await self._session.execute(
            text(
                """
                SELECT
                    (
                        SELECT COUNT(*)
                        FROM   pacientes
                        WHERE  criado_por = :usuario_id
                    ) AS total_pacientes,
                    (
                        SELECT COUNT(*)
                        FROM   avaliacoes a
                        JOIN   pacientes  p ON p.id = a.paciente_id
                        WHERE  p.criado_por      = :usuario_id
                          AND  a.data_avaliacao::DATE = CURRENT_DATE
                    ) AS avaliacoes_hoje,
                    (
                        SELECT COUNT(*)
                        FROM   avaliacoes a
                        JOIN   pacientes  p ON p.id = a.paciente_id
                        WHERE  p.criado_por    = :usuario_id
                          AND  a.data_avaliacao >= CURRENT_DATE - INTERVAL '7 days'
                    ) AS avaliacoes_semana,
                    (
                        SELECT ROUND(
                            COUNT(*) FILTER (WHERE a.recomenda_exame = TRUE)::NUMERIC
                            / NULLIF(COUNT(*), 0), 4
                        )
                        FROM   avaliacoes a
                        JOIN   pacientes  p ON p.id = a.paciente_id
                        WHERE  p.criado_por = :usuario_id
                    ) AS taxa_recomendacao_exame
                """
            ),
            {"usuario_id": usuario_id},
        )
        row = result.mappings().first()
        if row is None:
            return DashboardSummary(
                total_pacientes=0,
                avaliacoes_hoje=0,
                avaliacoes_semana=0,
                taxa_recomendacao_exame=None,
            )
        return DashboardSummary(
            total_pacientes=int(row["total_pacientes"] or 0),
            avaliacoes_hoje=int(row["avaliacoes_hoje"] or 0),
            avaliacoes_semana=int(row["avaliacoes_semana"] or 0),
            taxa_recomendacao_exame=float(row["taxa_recomendacao_exame"])
            if row["taxa_recomendacao_exame"] is not None
            else None,
        )

    async def refresh_materialized_view(self) -> None:
        """Trigger a non-blocking refresh of the materialized view."""
        await self._session.execute(
            text(
                "REFRESH MATERIALIZED VIEW CONCURRENTLY vw_dashboard_anonimizado"
            )
        )