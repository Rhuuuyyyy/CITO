from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class AgendamentoItem:
    id: int
    titulo: str
    tipo: str | None
    data_hora: datetime
    status: str
    paciente_id: int | None = None


class AgendamentoRepository:

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_active(self, *, usuario_id: int) -> list[AgendamentoItem]:
        result = await self._session.execute(
            text(
                """
                SELECT id, titulo, tipo, data_hora, status, paciente_id
                FROM   tb_agendamentos
                WHERE  usuario_id = :usuario_id
                  AND  status <> 'cancelado'
                ORDER  BY data_hora ASC
                """
            ),
            {"usuario_id": usuario_id},
        )
        rows = result.mappings().all()
        return [
            AgendamentoItem(
                id=int(r["id"]),
                titulo=str(r["titulo"]),
                tipo=cast("str | None", r["tipo"]),
                data_hora=cast(datetime, r["data_hora"]),
                status=str(r["status"]),
                paciente_id=int(r["paciente_id"]) if r["paciente_id"] is not None else None,
            )
            for r in rows
        ]

    async def add(
        self,
        *,
        usuario_id: int,
        paciente_id: int | None,
        titulo: str,
        tipo: str | None,
        data_hora: datetime,
        status: str,
    ) -> AgendamentoItem:
        result = await self._session.execute(
            text(
                """
                INSERT INTO tb_agendamentos (
                    paciente_id, usuario_id, titulo, tipo, data_hora, status
                ) VALUES (
                    :paciente_id, :usuario_id, :titulo, :tipo, :data_hora, :status
                )
                RETURNING id, titulo, tipo, data_hora, status, paciente_id
                """
            ),
            {
                "paciente_id": paciente_id,
                "usuario_id": usuario_id,
                "titulo": titulo,
                "tipo": tipo,
                "data_hora": data_hora,
                "status": status,
            },
        )
        row = result.mappings().first()
        if row is None:
            raise RuntimeError("Falha ao criar agendamento — RETURNING não retornou valor")
        return AgendamentoItem(
            id=int(row["id"]),
            titulo=str(row["titulo"]),
            tipo=cast("str | None", row["tipo"]),
            data_hora=cast(datetime, row["data_hora"]),
            status=str(row["status"]),
            paciente_id=int(row["paciente_id"]) if row["paciente_id"] is not None else None,
        )

    async def update(
        self,
        *,
        agendamento_id: int,
        usuario_id: int,
        titulo: str,
        tipo: str | None,
        data_hora: datetime,
        status: str,
    ) -> AgendamentoItem | None:
        result = await self._session.execute(
            text(
                """
                UPDATE tb_agendamentos
                SET    titulo = :titulo, tipo = :tipo,
                       data_hora = :data_hora, status = :status
                WHERE  id = :id AND usuario_id = :usuario_id
                RETURNING id, titulo, tipo, data_hora, status, paciente_id
                """
            ),
            {
                "id": agendamento_id,
                "usuario_id": usuario_id,
                "titulo": titulo,
                "tipo": tipo,
                "data_hora": data_hora,
                "status": status,
            },
        )
        row = result.mappings().first()
        if row is None:
            return None
        return AgendamentoItem(
            id=int(row["id"]),
            titulo=str(row["titulo"]),
            tipo=cast("str | None", row["tipo"]),
            data_hora=cast(datetime, row["data_hora"]),
            status=str(row["status"]),
            paciente_id=int(row["paciente_id"]) if row["paciente_id"] is not None else None,
        )

    async def delete(self, *, agendamento_id: int, usuario_id: int) -> bool:
        result = await self._session.execute(
            text(
                "DELETE FROM tb_agendamentos WHERE id = :id AND usuario_id = :uid "
                "RETURNING id"
            ),
            {"id": agendamento_id, "uid": usuario_id},
        )
        return result.first() is not None
