"""Read-only adapter for patient listing queries."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class PatientListItem:
    """Minimal patient record for list views (no PII decrypted)."""

    id: int
    nome: str
    sexo: str | None
    data_nascimento: str | None


class PatientReadRepository:
    """Reads patient lists from the 'pacientes' view."""

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
        conditions = ["criado_por = :usuario_id"]
        params: dict[str, object] = {
            "usuario_id": usuario_id,
            "limit": limit,
            "offset": offset,
        }
        if nome_filter:
            conditions.append("nome ILIKE :nome_filter")
            params["nome_filter"] = f"%{nome_filter}%"
        if cpf_hash_filter:
            conditions.append("cpf_hash = :cpf_hash_filter")
            params["cpf_hash_filter"] = cpf_hash_filter

        where_clause = " AND ".join(conditions)
        result = await self._session.execute(
            text(
                f"""
                SELECT id,
                       nome,
                       sexo,
                       TO_CHAR(data_nascimento, 'YYYY-MM-DD') AS data_nascimento
                FROM   pacientes
                WHERE  {where_clause}
                ORDER  BY nome ASC
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
                data_nascimento=str(r["data_nascimento"])
                if r["data_nascimento"] else None,
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
            text(
                f"SELECT COUNT(*) AS total FROM pacientes WHERE {where_clause}"
            ),
            params,
        )
        row = result.mappings().first()
        return int(row["total"]) if row else 0