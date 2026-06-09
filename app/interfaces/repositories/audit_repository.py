"""Outbound adapter: appends to the audit trail via fn_registrar_auditoria.

Audit writes are **best-effort**: each call runs inside a SAVEPOINT so that an
audit failure (e.g. the function/role being unavailable) never aborts the
surrounding clinical transaction. The trail mirrors what the legacy frontend
recorded (PACIENTE_CRIADO, AVALIACAO_FINALIZADA, ...).
"""
from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class AuditRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def registrar(
        self,
        *,
        usuario_id: int | None,
        sessao_id: int | None,
        acao: str,
        tabela: str,
        registro_id: str,
    ) -> None:
        """Record an audit entry. Never raises — failures are logged and swallowed."""
        try:
            async with self._session.begin_nested():
                await self._session.execute(
                    text(
                        """
                        SELECT fn_registrar_auditoria(
                            p_usuario_id  => :usuario_id,
                            p_sessao_id   => :sessao_id,
                            p_acao        => :acao,
                            p_tabela      => :tabela,
                            p_registro_id => :registro_id
                        )
                        """
                    ),
                    {
                        "usuario_id": usuario_id,
                        "sessao_id": sessao_id,
                        "acao": acao,
                        "tabela": tabela,
                        "registro_id": registro_id,
                    },
                )
        except Exception:  # noqa: BLE001 — audit must never break the main flow
            logger.warning("Falha ao registrar auditoria (%s) — ignorada.", acao)
