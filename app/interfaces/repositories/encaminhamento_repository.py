"""Outbound adapter: persists referrals into tb_encaminhamentos."""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class EncaminhamentoRepository:
    """Creates referrals generated from an evaluation (no PII)."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(
        self,
        *,
        avaliacao_id: int,
        tipo: str,
        justificativa: str | None,
        gerado_automaticamente: bool,
    ) -> None:
        await self._session.execute(
            text(
                """
                INSERT INTO tb_encaminhamentos (
                    avaliacao_id, tipo, justificativa, gerado_automaticamente
                ) VALUES (
                    :avaliacao_id, :tipo, :justificativa, :gerado_automaticamente
                )
                """
            ),
            {
                "avaliacao_id": avaliacao_id,
                "tipo": tipo,
                "justificativa": justificativa,
                "gerado_automaticamente": gerado_automaticamente,
            },
        )
