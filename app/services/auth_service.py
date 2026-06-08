"""AuthService — manages doctor sessions and authentication audit trail."""
from __future__ import annotations

from typing import cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class AuthService:
    """Coordinates authentication and session lifecycle against the DB.

    The 'usuarios' table uses bcrypt via DB trigger (trg_hash_senha_usuario).
    Password verification uses PostgreSQL's native crypt() function —
    the Python layer never handles bcrypt directly.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def open_session(
        self,
        *,
        usuario_id: int,
        ip_origem: str,
        user_agent: str,
    ) -> int:
        """Register a new authenticated session. Returns sessao_id (BIGSERIAL)."""
        result = await self._session.execute(
            text(
                """
                INSERT INTO tb_log_sessoes (usuario_id, ip_origem, user_agent)
                VALUES (:usuario_id, :ip_origem, :user_agent)
                RETURNING id
                """
            ),
            {
                "usuario_id": usuario_id,
                "ip_origem": ip_origem,
                "user_agent": user_agent,
            },
        )
        row = result.mappings().first()
        if row is None:
            raise RuntimeError("Failed to open session — no id returned")
        return cast(int, row["id"])

    async def close_session(
        self,
        *,
        sessao_id: int,
        tipo_encerramento: str,
    ) -> None:
        """Mark a session as closed in tb_log_sessoes."""
        await self._session.execute(
            text(
                """
                UPDATE tb_log_sessoes
                SET encerrada_em = NOW(), tipo_encerramento = :tipo
                WHERE id = :id
                """
            ),
            {"tipo": tipo_encerramento, "id": sessao_id},
        )

    async def log_tentativa_login(
        self,
        *,
        email_tentado: str,
        ip_origem: str,
        user_agent: str,
        sucesso: bool,
        usuario_id: int | None = None,
        sessao_id: int | None = None,
        motivo_falha: str | None = None,
    ) -> None:
        """Append-only record of every login attempt (success or failure)."""
        await self._session.execute(
            text(
                """
                INSERT INTO tb_log_tentativas_login
                    (email_tentado, ip_origem, user_agent, sucesso,
                     usuario_id, sessao_id, motivo_falha)
                VALUES
                    (:email_tentado, :ip_origem, :user_agent, :sucesso,
                     :usuario_id, :sessao_id, :motivo_falha)
                """
            ),
            {
                "email_tentado": email_tentado,
                "ip_origem": ip_origem,
                "user_agent": user_agent,
                "sucesso": sucesso,
                "usuario_id": usuario_id,
                "sessao_id": sessao_id,
                "motivo_falha": motivo_falha,
            },
        )

    async def check_brute_force(
        self,
        *,
        ip_origem: str,
        janela_minutos: int = 10,
        max_falhas: int = 5,
    ) -> bool:
        """Returns True if the IP has exceeded the failure threshold."""
        result = await self._session.execute(
            text(
                """
                SELECT COUNT(*) AS total
                FROM tb_log_tentativas_login
                WHERE ip_origem = CAST(:ip AS INET)
                  AND sucesso = FALSE
                  AND tentado_em > NOW() - (:janela * INTERVAL '1 minute')
                """
            ),
            {"ip": ip_origem, "janela": janela_minutos},
        )
        row = result.mappings().first()
        total = cast(int, row["total"]) if row else 0
        return total >= max_falhas

    async def authenticate_doctor(
        self,
        *,
        email: str,
        senha_plain: str,
    ) -> int | None:
        """Verify credentials against the DB using PostgreSQL native crypt().

        Returns the usuario_id (INTEGER) if valid, or None if invalid.
        NEVER log senha_plain.
        """
        result = await self._session.execute(
            text(
                """
                SELECT id
                FROM usuarios
                WHERE email = LOWER(:email)
                  AND senha = crypt(:senha, senha)
                  AND ativo = TRUE
                """
            ),
            {"email": email, "senha": senha_plain},
        )
        row = result.mappings().first()
        return int(cast(int, row["id"])) if row else None