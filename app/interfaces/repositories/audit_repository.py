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
        except Exception:
            logger.warning("Falha ao registrar auditoria (%s) — ignorada.", acao)
