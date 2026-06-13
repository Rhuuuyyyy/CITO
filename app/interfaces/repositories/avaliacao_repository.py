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

    async def delete_cascade(
        self, *, avaliacao_id: int, usuario_id: int, is_admin: bool = False
    ) -> bool:
        """Permanently delete one evaluation and ALL its dependent records.

        Ownership is checked FIRST (a doctor may delete only evaluations of
        their own patients; an admin may delete any). Only then the children
        are removed — there is no ON DELETE CASCADE in the schema. Audit rows
        (tb_auditoria, keyed by string registro_id) are intentionally kept.
        Returns False when the evaluation does not exist or is out of reach.
        """
        owner_clause = "" if is_admin else "AND p.criado_por = :uid"
        check = await self._session.execute(
            text(
                f"""
                SELECT av.id
                FROM   tb_avaliacoes av
                JOIN   tb_pacientes p ON p.id = av.paciente_id
                WHERE  av.id = :id {owner_clause}
                """
            ),
            {"id": avaliacao_id, "uid": usuario_id},
        )
        if check.first() is None:
            return False

        for child in (
            "respostas_checklist",
            "tb_historico_familiar",
            "tb_encaminhamentos",
            "tb_log_analises",
        ):
            await self._session.execute(
                text(f"DELETE FROM {child} WHERE avaliacao_id = :id"),
                {"id": avaliacao_id},
            )
        await self._session.execute(
            text("DELETE FROM tb_avaliacoes WHERE id = :id"),
            {"id": avaliacao_id},
        )
        return True