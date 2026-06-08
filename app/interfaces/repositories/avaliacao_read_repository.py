"""Read-only adapter for clinical evaluations history."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class AvaliacaoHistoricoItem:
    """One evaluation record returned for history queries."""

    avaliacao_id: int
    paciente_id: int
    usuario_id: int
    data_avaliacao: datetime
    score_final: float | None
    recomenda_exame: bool | None


class AvaliacaoReadRepository:
    """Reads evaluation history from the 'avaliacoes' view."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_paciente(
        self,
        *,
        paciente_id: int,
        usuario_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> list[AvaliacaoHistoricoItem]:
        result = await self._session.execute(
            text(
                """
                SELECT a.id          AS avaliacao_id,
                       a.paciente_id,
                       a.usuario_id,
                       a.data_avaliacao,
                       a.score_final,
                       a.recomenda_exame
                FROM   avaliacoes a
                JOIN   pacientes  p ON p.id = a.paciente_id
                WHERE  a.paciente_id = :paciente_id
                  AND  p.criado_por  = :usuario_id
                ORDER  BY a.data_avaliacao ASC
                LIMIT  :limit OFFSET :offset
                """
            ),
            {
                "paciente_id": paciente_id,
                "usuario_id": usuario_id,
                "limit": limit,
                "offset": offset,
            },
        )
        rows = result.mappings().all()
        return [
            AvaliacaoHistoricoItem(
                avaliacao_id=cast(int, r["avaliacao_id"]),
                paciente_id=cast(int, r["paciente_id"]),
                usuario_id=cast(int, r["usuario_id"]),
                data_avaliacao=cast(datetime, r["data_avaliacao"]),
                score_final=cast("float | None", r["score_final"]),
                recomenda_exame=cast("bool | None", r["recomenda_exame"]),
            )
            for r in rows
        ]

    async def count_by_paciente(
        self,
        *,
        paciente_id: int,
        usuario_id: int,
    ) -> int:
        result = await self._session.execute(
            text(
                """
                SELECT COUNT(*) AS total
                FROM   avaliacoes a
                JOIN   pacientes  p ON p.id = a.paciente_id
                WHERE  a.paciente_id = :paciente_id
                  AND  p.criado_por  = :usuario_id
                """
            ),
            {"paciente_id": paciente_id, "usuario_id": usuario_id},
        )
        row = result.mappings().first()
        return int(cast(int, row["total"])) if row else 0