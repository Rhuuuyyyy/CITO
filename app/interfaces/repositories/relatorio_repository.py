from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


@dataclass(frozen=True)
class RelatorioAvaliacaoItem:
    avaliacao_id: int
    data_avaliacao: datetime
    score_final: float | None
    sexo: str | None
    nome: str
    medico: str | None


class RelatorioRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_finalizadas(
        self,
        *,
        restrict_to_usuario_id: int | None = None,
        data_inicio: str | None = None,
        data_fim: str | None = None,
        sexo: str | None = None,
    ) -> list[RelatorioAvaliacaoItem]:
        conditions = ["a.status = 'finalizada'"]
        params: dict[str, object] = {}
        if restrict_to_usuario_id is not None:
            conditions.append("p.criado_por = :usuario_id")
            params["usuario_id"] = restrict_to_usuario_id
        di = _parse_date(data_inicio)
        df = _parse_date(data_fim)
        if di is not None:
            conditions.append("a.data_avaliacao >= :data_inicio")
            params["data_inicio"] = di
        if df is not None:
            conditions.append("a.data_avaliacao < :data_fim_excl")
            params["data_fim_excl"] = df + timedelta(days=1)
        if sexo:
            conditions.append("p.sexo = :sexo")
            params["sexo"] = sexo

        where_clause = " AND ".join(conditions)
        result = await self._session.execute(
            text(
                f"""
                SELECT a.id AS avaliacao_id, a.data_avaliacao, a.score_final,
                       p.sexo, p.nome, u.nome AS medico
                FROM   avaliacoes a
                JOIN   pacientes  p ON p.id = a.paciente_id
                LEFT JOIN usuarios u ON u.id = a.usuario_id
                WHERE  {where_clause}
                ORDER  BY a.data_avaliacao DESC
                """
            ),
            params,
        )
        rows = result.mappings().all()
        return [
            RelatorioAvaliacaoItem(
                avaliacao_id=int(r["avaliacao_id"]),
                data_avaliacao=cast(datetime, r["data_avaliacao"]),
                score_final=float(r["score_final"]) if r["score_final"] is not None else None,
                sexo=cast("str | None", r["sexo"]),
                nome=str(r["nome"]),
                medico=str(r["medico"]) if r["medico"] else None,
            )
            for r in rows
        ]
