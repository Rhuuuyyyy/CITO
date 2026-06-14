from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class AvaliacaoHistoricoItem:

    avaliacao_id: int
    paciente_id: int
    usuario_id: int
    data_avaliacao: datetime
    score_final: float | None
    recomenda_exame: bool | None


@dataclass(frozen=True)
class SintomaRespostaItem:

    descricao: str
    presente: bool


@dataclass(frozen=True)
class HistoricoFamiliarItem:

    deficiencia_intelectual: bool
    falencia_ovariana_precoce: bool
    autismo_na_familia: bool
    epilepsia: bool
    infertilidade_masculina: bool
    menopausa_precoce: bool
    abortos_recorrentes: bool
    tremor_ataxia_familiar: bool
    descricao_outros: str | None


@dataclass(frozen=True)
class AvaliacaoFullDetail:

    avaliacao_id: int
    data_avaliacao: datetime
    score_final: float | None
    recomenda_exame: bool | None
    paciente_nome: str
    paciente_sexo: str | None
    paciente_data_nascimento: str | None
    acompanhante_nome: str | None
    acompanhante_relacao: str | None
    acompanhante_telefone: str | None
    acompanhante_email: str | None
    sintomas: list[SintomaRespostaItem]
    historico: HistoricoFamiliarItem | None


class AvaliacaoReadRepository:

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_paciente(
        self,
        *,
        paciente_id: int,
        usuario_id: int,
        limit: int = 50,
        offset: int = 0,
        is_admin: bool = False,
    ) -> list[AvaliacaoHistoricoItem]:
        owner_clause = "" if is_admin else "AND p.criado_por = :usuario_id"
        result = await self._session.execute(
            text(
                f"""
                SELECT a.id          AS avaliacao_id,
                       a.paciente_id,
                       a.usuario_id,
                       a.data_avaliacao,
                       a.score_final,
                       a.recomenda_exame
                FROM   avaliacoes a
                JOIN   pacientes  p ON p.id = a.paciente_id
                WHERE  a.paciente_id = :paciente_id
                  {owner_clause}
                ORDER  BY a.data_avaliacao ASC
                LIMIT  :limit OFFSET :offset
                """
            ),
            {
                "paciente_id": paciente_id,
                "usuario_id": usuario_id,
                "limit": limit,
                "offset": offset,
            },
        )
        rows = result.mappings().all()
        return [
            AvaliacaoHistoricoItem(
                avaliacao_id=cast(int, r["avaliacao_id"]),
                paciente_id=cast(int, r["paciente_id"]),
                usuario_id=cast(int, r["usuario_id"]),
                data_avaliacao=cast(datetime, r["data_avaliacao"]),
                score_final=cast("float | None", r["score_final"]),
                recomenda_exame=cast("bool | None", r["recomenda_exame"]),
            )
            for r in rows
        ]

    async def get_full(
        self,
        *,
        avaliacao_id: int,
        usuario_id: int,
        is_admin: bool = False,
    ) -> AvaliacaoFullDetail | None:
        owner_clause = "" if is_admin else "AND p.criado_por = :usuario_id"
        head = await self._session.execute(
            text(
                f"""
                SELECT a.id AS avaliacao_id, a.data_avaliacao,
                       a.score_final, a.recomenda_exame,
                       p.nome AS paciente_nome, p.sexo AS paciente_sexo,
                       TO_CHAR(p.data_nascimento, 'YYYY-MM-DD') AS data_nascimento,
                       ac.nome AS acomp_nome, ac.telefone AS acomp_telefone,
                       ac.email AS acomp_email,
                       COALESCE(ta.grau_parentesco, p.grau_parentesco) AS acomp_relacao
                FROM   avaliacoes a
                JOIN   tb_avaliacoes ta ON ta.id = a.id
                JOIN   pacientes  p ON p.id = a.paciente_id
                -- Acompanhante DESTA avaliação (modelo B); se nulo (avaliações
                -- antigas), cai no acompanhante atual do paciente.
                LEFT JOIN acompanhantes ac
                       ON ac.id = COALESCE(ta.acompanhante_id, p.acompanhante_id)
                WHERE  a.id = :avaliacao_id {owner_clause}
                """
            ),
            {"avaliacao_id": avaliacao_id, "usuario_id": usuario_id},
        )
        h = head.mappings().first()
        if h is None:
            return None

        sint_rows = await self._session.execute(
            text(
                """
                SELECT s.descricao, rc.presente
                FROM   respostas_checklist rc
                JOIN   sintomas s ON s.id = rc.sintoma_id
                WHERE  rc.avaliacao_id = :avaliacao_id
                ORDER  BY s.id
                """
            ),
            {"avaliacao_id": avaliacao_id},
        )
        sintomas = [
            SintomaRespostaItem(
                descricao=str(r["descricao"]),
                presente=bool(r["presente"]),
            )
            for r in sint_rows.mappings().all()
        ]

        hist_row = await self._session.execute(
            text(
                """
                SELECT deficiencia_intelectual, falencia_ovariana_precoce,
                       autismo_na_familia, epilepsia, infertilidade_masculina,
                       menopausa_precoce, abortos_recorrentes,
                       tremor_ataxia_familiar, descricao_outros
                FROM   tb_historico_familiar
                WHERE  avaliacao_id = :avaliacao_id
                """
            ),
            {"avaliacao_id": avaliacao_id},
        )
        hr = hist_row.mappings().first()
        historico = (
            HistoricoFamiliarItem(
                deficiencia_intelectual=bool(hr["deficiencia_intelectual"]),
                falencia_ovariana_precoce=bool(hr["falencia_ovariana_precoce"]),
                autismo_na_familia=bool(hr["autismo_na_familia"]),
                epilepsia=bool(hr["epilepsia"]),
                infertilidade_masculina=bool(hr["infertilidade_masculina"]),
                menopausa_precoce=bool(hr["menopausa_precoce"]),
                abortos_recorrentes=bool(hr["abortos_recorrentes"]),
                tremor_ataxia_familiar=bool(hr["tremor_ataxia_familiar"]),
                descricao_outros=(
                    str(hr["descricao_outros"]) if hr["descricao_outros"] else None
                ),
            )
            if hr is not None
            else None
        )

        return AvaliacaoFullDetail(
            avaliacao_id=int(h["avaliacao_id"]),
            data_avaliacao=cast(datetime, h["data_avaliacao"]),
            score_final=cast("float | None", h["score_final"]),
            recomenda_exame=cast("bool | None", h["recomenda_exame"]),
            paciente_nome=str(h["paciente_nome"]),
            paciente_sexo=str(h["paciente_sexo"]) if h["paciente_sexo"] else None,
            paciente_data_nascimento=(
                str(h["data_nascimento"]) if h["data_nascimento"] else None
            ),
            acompanhante_nome=str(h["acomp_nome"]) if h["acomp_nome"] else None,
            acompanhante_relacao=str(h["acomp_relacao"]) if h["acomp_relacao"] else None,
            acompanhante_telefone=(
                str(h["acomp_telefone"]) if h["acomp_telefone"] else None
            ),
            acompanhante_email=str(h["acomp_email"]) if h["acomp_email"] else None,
            sintomas=sintomas,
            historico=historico,
        )

    async def count_by_paciente(
        self,
        *,
        paciente_id: int,
        usuario_id: int,
        is_admin: bool = False,
    ) -> int:
        owner_clause = "" if is_admin else "AND p.criado_por = :usuario_id"
        result = await self._session.execute(
            text(
                f"""
                SELECT COUNT(*) AS total
                FROM   avaliacoes a
                JOIN   pacientes  p ON p.id = a.paciente_id
                WHERE  a.paciente_id = :paciente_id
                  {owner_clause}
                """
            ),
            {"paciente_id": paciente_id, "usuario_id": usuario_id},
        )
        row = result.mappings().first()
        return int(cast(int, row["total"])) if row else 0