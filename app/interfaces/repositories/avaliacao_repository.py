"""Outbound adapter: interacts with the 'avaliacoes' view and tb_log_analises."""
from typing import cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class AvaliacaoRepository:
    """Manages the lifecycle of a clinical evaluation (avaliação)."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_rascunho(
        self,
        *,
        paciente_id: int,
        usuario_id: int,
        observacoes: str,
        diagnostico_previo_fxs: bool,
    ) -> int:
        """Insert a new evaluation with status='rascunho'. Returns avaliacao_id."""
        result = await self._session.execute(
            text(
                """
                INSERT INTO avaliacoes (paciente_id, usuario_id, observacoes,
                                        diagnostico_previo_fxs)
                VALUES (:paciente_id, :usuario_id, :observacoes,
                        :diagnostico_previo_fxs)
                RETURNING id
                """
            ),
            {
                "paciente_id": paciente_id,
                "usuario_id": usuario_id,
                "observacoes": observacoes,
                "diagnostico_previo_fxs": diagnostico_previo_fxs,
            },
        )
        row = result.mappings().first()
        if row is None:
            raise RuntimeError("Failed to create avaliacao — no id returned")
        return cast(int, row["id"])

    async def open_log_analise(
        self,
        *,
        avaliacao_id: int,
        usuario_id: int,
        sessao_id: int,
    ) -> int:
        """Insert into tb_log_analises to record when the doctor opened the form.

        Returns the log_analise id.
        """
        result = await self._session.execute(
            text(
                """
                INSERT INTO tb_log_analises (avaliacao_id, usuario_id, sessao_id)
                VALUES (:avaliacao_id, :usuario_id, :sessao_id)
                RETURNING id
                """
            ),
            {
                "avaliacao_id": avaliacao_id,
                "usuario_id": usuario_id,
                "sessao_id": sessao_id,
            },
        )
        row = result.mappings().first()
        if row is None:
            raise RuntimeError("Failed to open log_analise — no id returned")
        return cast(int, row["id"])