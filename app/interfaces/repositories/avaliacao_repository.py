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

    async def set_acompanhante(
        self,
        *,
        avaliacao_id: int,
        acompanhante_id: int | None,
        grau_parentesco: str | None = None,
    ) -> None:
        """Record who attended THIS evaluation and their relationship (model B).

        No-op when acompanhante_id is None — so triagens without a caregiver
        don't touch the columns (and don't fail if they aren't there yet).
        Writes directly to tb_avaliacoes (the 'avaliacoes' view doesn't carry it).
        """
        if acompanhante_id is None:
            return
        await self._session.execute(
            text(
                "UPDATE tb_avaliacoes SET acompanhante_id = :aid, "
                "grau_parentesco = :rel WHERE id = :id"
            ),
            {"aid": acompanhante_id, "rel": grau_parentesco, "id": avaliacao_id},
        )

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