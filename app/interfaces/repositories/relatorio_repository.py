"""Read-only adapter for clinical reports (Config → Relatórios).

Returns the authenticated doctor's finalised evaluations so the frontend can
build weekly/monthly activity charts. Does not depend on the avaliacoes view
exposing ``recomenda_exame`` — the referral flag is derived from score + sex
client-side, preserving the legacy report behaviour.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class RelatorioAvaliacaoItem:
    data_avaliacao: datetime
    score_final: float | None
    sexo: str | None
    nome: str


class RelatorioRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_finalizadas(self, *, usuario_id: int) -> list[RelatorioAvaliacaoItem]:
        result = await self._session.execute(
            text(
                """
                SELECT a.data_avaliacao, a.score_final, p.sexo, p.nome
                FROM   avaliacoes a
                JOIN   pacientes  p ON p.id = a.paciente_id
                WHERE  p.criado_por = :usuario_id
                  AND  a.status = 'finalizada'
                ORDER  BY a.data_avaliacao DESC
                """
            ),
            {"usuario_id": usuario_id},
        )
        rows = result.mappings().all()
        return [
            RelatorioAvaliacaoItem(
                data_avaliacao=cast(datetime, r["data_avaliacao"]),
                score_final=float(r["score_final"]) if r["score_final"] is not None else None,
                sexo=cast("str | None", r["sexo"]),
                nome=str(r["nome"]),
            )
            for r in rows
        ]
