"""Concrete adapter: persists Acompanhante via the 'acompanhantes' DB view."""
from typing import cast
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.acompanhante import Acompanhante
from app.domain.value_objects.cpf import CPF


class AcompanhanteRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, acompanhante: Acompanhante) -> Acompanhante:
        await self._session.execute(
            text(
                """
                INSERT INTO acompanhantes (id, nome, cpf_hash, telefone, email)
                VALUES (:id, :nome, :cpf_hash, :telefone, :email)
                """
            ),
            {
                "id": str(acompanhante.id),
                "nome": acompanhante.nome,
                "cpf_hash": acompanhante.cpf.sha256_hex if acompanhante.cpf else None,
                "telefone": acompanhante.telefone,
                "email": acompanhante.email,
            },
        )
        return acompanhante

    async def get_by_id(self, entity_id: UUID) -> Acompanhante | None:
        result = await self._session.execute(
            text(
                "SELECT id, nome, telefone, email FROM acompanhantes WHERE id = :id"
            ),
            {"id": str(entity_id)},
        )
        row = result.mappings().first()
        if row is None:
            return None
        return Acompanhante(
            id=cast(UUID, row["id"]),
            nome=cast(str, row["nome"]),
            cpf=None,
            telefone=cast(str, row["telefone"]),
            email=cast(str, row["email"]),
        )

    async def get_by_cpf(self, cpf: CPF) -> Acompanhante | None:
        result = await self._session.execute(
            text(
                """
                SELECT id, nome, telefone, email
                FROM acompanhantes WHERE cpf_hash = :cpf_hash
                """
            ),
            {"cpf_hash": cpf.sha256_hex},
        )
        row = result.mappings().first()
        if row is None:
            return None
        return Acompanhante(
            id=cast(UUID, row["id"]),
            nome=cast(str, row["nome"]),
            cpf=None,
            telefone=cast(str, row["telefone"]),
            email=cast(str, row["email"]),
        )