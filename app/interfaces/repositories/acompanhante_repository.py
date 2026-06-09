"""Concrete adapter: persists Acompanhante via the 'acompanhantes' DB view.

The view's INSTEAD OF trigger encrypts ``nome`` into ``nome_criptografado``;
the application always works with clear text. The ``id`` is a DB SERIAL.
"""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.acompanhante import Acompanhante
from app.domain.value_objects.cpf import CPF


class AcompanhanteRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, acompanhante: Acompanhante) -> Acompanhante:
        """Persist a new acompanhante and return it with the DB id populated."""
        result = await self._session.execute(
            text(
                """
                INSERT INTO acompanhantes (nome, cpf_hash, telefone, email)
                VALUES (:nome, :cpf_hash, :telefone, :email)
                RETURNING id
                """
            ),
            {
                "nome": acompanhante.nome,
                "cpf_hash": acompanhante.cpf.sha256_hex if acompanhante.cpf else None,
                "telefone": acompanhante.telefone,
                "email": acompanhante.email,
            },
        )
        row = result.mappings().first()
        if row is None:
            raise RuntimeError(
                "Falha ao inserir acompanhante — RETURNING id não retornou valor"
            )
        return acompanhante.model_copy(update={"id": int(row["id"])})

    async def get_by_id(self, entity_id: int) -> Acompanhante | None:
        result = await self._session.execute(
            text(
                "SELECT id, nome, telefone, email FROM acompanhantes WHERE id = :id"
            ),
            {"id": entity_id},
        )
        row = result.mappings().first()
        if row is None:
            return None
        return Acompanhante(
            id=int(row["id"]),
            nome=str(row["nome"]),
            cpf=None,
            telefone=row["telefone"],
            email=row["email"],
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
            id=int(row["id"]),
            nome=str(row["nome"]),
            cpf=None,
            telefone=row["telefone"],
            email=row["email"],
        )
