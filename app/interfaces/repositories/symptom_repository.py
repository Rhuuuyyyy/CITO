"""Read-only adapter for the active symptom catalog (sintomas table)."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class SintomaItem:
    id: int
    descricao: str


class SymptomReadRepository:
    """Reads the active symptom catalog used to build the screening payload."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_active(self) -> list[SintomaItem]:
        result = await self._session.execute(
            text(
                """
                SELECT id, descricao
                FROM   sintomas
                WHERE  ativo = TRUE
                ORDER  BY id
                """
            )
        )
        rows = result.mappings().all()
        return [
            SintomaItem(id=int(r["id"]), descricao=str(r["descricao"]))
            for r in rows
        ]
