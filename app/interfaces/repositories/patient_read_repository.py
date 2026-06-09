"""Read-only adapter for patient listing queries."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class PatientListItem:
    """Patient record for list views, enriched with caregiver + last evaluation.

    ``nome`` is the decrypted name (masking is applied in the presentation layer).
    """

    id: int
    nome: str
    sexo: str | None
    data_nascimento: str | None
    cpf_hash: str | None
    telefone: str | None
    tem_acompanhante: bool
    ultimo_score: float | None
    ultima_avaliacao: str | None
    recomenda_exame: bool | None


class PatientReadRepository:
    """Reads patient lists from the 'pacientes' view, joined with caregiver and
    the patient's most recent finalised evaluation."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_doctor(
        self,
        *,
        usuario_id: int,
        nome_filter: str | None = None,
        cpf_hash_filter: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[PatientListItem]:
        conditions = ["p.criado_por = :usuario_id"]
        params: dict[str, object] = {
            "usuario_id": usuario_id,
            "limit": limit,
            "offset": offset,
        }
        if nome_filter:
            conditions.append("p.nome ILIKE :nome_filter")
            params["nome_filter"] = f"%{nome_filter}%"
        if cpf_hash_filter:
            conditions.append("p.cpf_hash = :cpf_hash_filter")
            params["cpf_hash_filter"] = cpf_hash_filter

        where_clause = " AND ".join(conditions)
        result = await self._session.execute(
            text(
                f"""
                SELECT p.id,
                       p.nome,
                       p.sexo,
                       TO_CHAR(p.data_nascimento, 'YYYY-MM-DD') AS data_nascimento,
                       p.cpf_hash,
                       ac.telefone,
                       (p.acompanhante_id IS NOT NULL) AS tem_acompanhante,
                       ult.score_final AS ultimo_score,
                       TO_CHAR(ult.data_avaliacao, 'YYYY-MM-DD') AS ultima_avaliacao,
                       ult.recomenda_exame
                FROM   pacientes p
                LEFT JOIN acompanhantes ac ON ac.id = p.acompanhante_id
                LEFT JOIN LATERAL (
                    SELECT a.score_final, a.data_avaliacao, a.recomenda_exame
                    FROM   avaliacoes a
                    WHERE  a.paciente_id = p.id
                      AND  a.status = 'finalizada'
                    ORDER  BY a.data_avaliacao DESC
                    LIMIT  1
                ) ult ON TRUE
                WHERE  {where_clause}
                ORDER  BY p.id DESC
                LIMIT  :limit OFFSET :offset
                """
            ),
            params,
        )
        rows = result.mappings().all()
        return [
            PatientListItem(
                id=int(r["id"]),
                nome=str(r["nome"]),
                sexo=str(r["sexo"]) if r["sexo"] else None,
                data_nascimento=str(r["data_nascimento"]) if r["data_nascimento"] else None,
                cpf_hash=str(r["cpf_hash"]) if r["cpf_hash"] else None,
                telefone=str(r["telefone"]) if r["telefone"] else None,
                tem_acompanhante=bool(r["tem_acompanhante"]),
                ultimo_score=float(r["ultimo_score"]) if r["ultimo_score"] is not None else None,
                ultima_avaliacao=str(r["ultima_avaliacao"]) if r["ultima_avaliacao"] else None,
                recomenda_exame=bool(r["recomenda_exame"]) if r["recomenda_exame"] is not None else None,
            )
            for r in rows
        ]

    async def count_by_doctor(
        self,
        *,
        usuario_id: int,
        nome_filter: str | None = None,
        cpf_hash_filter: str | None = None,
    ) -> int:
        conditions = ["criado_por = :usuario_id"]
        params: dict[str, object] = {"usuario_id": usuario_id}
        if nome_filter:
            conditions.append("nome ILIKE :nome_filter")
            params["nome_filter"] = f"%{nome_filter}%"
        if cpf_hash_filter:
            conditions.append("cpf_hash = :cpf_hash_filter")
            params["cpf_hash_filter"] = cpf_hash_filter

        where_clause = " AND ".join(conditions)
        result = await self._session.execute(
            text(f"SELECT COUNT(*) AS total FROM pacientes WHERE {where_clause}"),
            params,
        )
        row = result.mappings().first()
        return int(row["total"]) if row else 0
