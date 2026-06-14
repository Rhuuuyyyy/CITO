from typing import cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class AvaliacaoRepository:

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