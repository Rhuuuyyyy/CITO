"""Read/write adapter for the 'usuarios' table (admin user management).

Passwords are hashed by a DB trigger (trg_hash_senha_usuario via bcrypt) — the
application inserts the plaintext password and never handles bcrypt directly.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class UserListItem:
    id: int
    nome: str
    email: str
    crm: str | None
    especialidade: str | None
    tipo: str | None
    ativo: bool
    ultimo_acesso: datetime | None


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def email_exists(self, email: str) -> bool:
        result = await self._session.execute(
            text("SELECT 1 FROM usuarios WHERE email = LOWER(:email) LIMIT 1"),
            {"email": email},
        )
        return result.first() is not None

    async def create_medico(
        self,
        *,
        nome: str,
        email: str,
        crm: str | None,
        especialidade: str | None,
        senha_plain: str,
    ) -> int:
        """Insert a new 'medico' user.

        The password is bcrypt-hashed by PostgreSQL's pgcrypto (`crypt` +
        `gen_salt('bf')`) right in the INSERT — the deployed DB has no hashing
        trigger, and the Python layer never handles bcrypt itself. Login verifies
        with the matching `crypt(:senha, senha)`.
        """
        result = await self._session.execute(
            text(
                """
                INSERT INTO usuarios (nome, email, crm, especialidade, senha, tipo, ativo)
                VALUES (:nome, LOWER(:email), :crm, :especialidade,
                        crypt(:senha, gen_salt('bf')), 'medico', TRUE)
                RETURNING id
                """
            ),
            {
                "nome": nome,
                "email": email,
                "crm": crm,
                "especialidade": especialidade,
                "senha": senha_plain,
            },
        )
        row = result.mappings().first()
        if row is None:
            raise RuntimeError("Falha ao inserir usuário — RETURNING id vazio")
        return int(row["id"])

    async def list_all(self) -> list[UserListItem]:
        result = await self._session.execute(
            text(
                """
                SELECT id, nome, email, crm, especialidade, tipo, ativo, ultimo_acesso
                FROM   usuarios
                ORDER  BY ativo DESC, nome
                """
            )
        )
        return [
            UserListItem(
                id=int(r["id"]),
                nome=str(r["nome"]),
                email=str(r["email"]),
                crm=str(r["crm"]) if r["crm"] else None,
                especialidade=str(r["especialidade"]) if r["especialidade"] else None,
                tipo=str(r["tipo"]) if r["tipo"] else None,
                ativo=bool(r["ativo"]),
                ultimo_acesso=r["ultimo_acesso"],
            )
            for r in result.mappings().all()
        ]

    async def get_by_id(self, user_id: int) -> UserListItem | None:
        result = await self._session.execute(
            text(
                """
                SELECT id, nome, email, crm, especialidade, tipo, ativo, ultimo_acesso
                FROM   usuarios WHERE id = :id
                """
            ),
            {"id": user_id},
        )
        r = result.mappings().first()
        if r is None:
            return None
        return UserListItem(
            id=int(r["id"]),
            nome=str(r["nome"]),
            email=str(r["email"]),
            crm=str(r["crm"]) if r["crm"] else None,
            especialidade=str(r["especialidade"]) if r["especialidade"] else None,
            tipo=str(r["tipo"]) if r["tipo"] else None,
            ativo=bool(r["ativo"]),
            ultimo_acesso=r["ultimo_acesso"],
        )

    async def set_ativo(self, *, user_id: int, ativo: bool) -> bool:
        """Soft enable/disable a user. Returns True if a row was updated."""
        result = await self._session.execute(
            text("UPDATE usuarios SET ativo = :ativo WHERE id = :id RETURNING id"),
            {"ativo": ativo, "id": user_id},
        )
        return result.first() is not None

    async def verify_password(self, *, user_id: int, senha_plain: str) -> bool:
        """Check a plaintext password against a user's stored bcrypt hash."""
        result = await self._session.execute(
            text(
                "SELECT 1 FROM usuarios WHERE id = :id AND senha = crypt(:senha, senha)"
            ),
            {"id": user_id, "senha": senha_plain},
        )
        return result.first() is not None

    async def delete(self, *, user_id: int) -> None:
        """Hard-delete a user. Raises IntegrityError if the user is still
        referenced by clinical/audit records (FK) — the caller maps that to a
        friendly 409 recommending deactivation instead."""
        await self._session.execute(
            text("DELETE FROM usuarios WHERE id = :id"),
            {"id": user_id},
        )
