from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class PatientListItem:

    id: int
    nome: str
    sexo: str | None
    data_nascimento: str | None
    cpf_hash: str | None
    telefone: str | None
    qtd_acompanhantes: int
    ultimo_score: float | None
    ultima_avaliacao: str | None
    recomenda_exame: bool | None
    ativo: bool
    medico: str | None = None


@dataclass(frozen=True)
class AcompanhanteDetail:

    id: int
    nome: str
    relacao: str | None
    telefone: str | None
    email: str | None


@dataclass(frozen=True)
class PatientDetail:

    id: int
    nome: str
    sexo: str | None
    data_nascimento: str | None
    idade_anos: int | None
    cpf_hash: str | None
    etnia: str | None
    telefone: str | None
    municipio_residencia: str | None
    uf_residencia: str | None
    prematuro: bool | None
    escolaridade: str | None
    tem_diagnostico_autismo: bool | None
    tem_diagnostico_tdah: bool | None
    outras_comorbidades: str | None
    medicamentos_uso: str | None
    diagnostico_confirmado_fxs: bool | None
    acompanhantes: list[AcompanhanteDetail]


class PatientReadRepository:

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_doctor(
        self,
        *,
        restrict_to_usuario_id: int | None,
        nome_filter: str | None = None,
        cpf_hash_filter: str | None = None,
        incluir_inativos: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> list[PatientListItem]:
        conditions: list[str] = []
        params: dict[str, object] = {
            "limit": limit,
            "offset": offset,
        }
        if restrict_to_usuario_id is not None:
            conditions.append("p.criado_por = :usuario_id")
            params["usuario_id"] = restrict_to_usuario_id
        if not incluir_inativos:
            conditions.append("p.ativo = TRUE")
        if nome_filter:
            conditions.append("p.nome ILIKE :nome_filter")
            params["nome_filter"] = f"%{nome_filter}%"
        if cpf_hash_filter:
            conditions.append("p.cpf_hash = :cpf_hash_filter")
            params["cpf_hash_filter"] = cpf_hash_filter

        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        result = await self._session.execute(
            text(
                f"""
                SELECT p.id,
                       p.nome,
                       p.sexo,
                       TO_CHAR(p.data_nascimento, 'YYYY-MM-DD') AS data_nascimento,
                       p.cpf_hash,
                       ptel.telefone,
                       med.nome AS medico,
                       -- Total de acompanhantes DISTINTOS do paciente: o do
                       -- cadastro + os registrados em cada triagem (modelo B).
                       (
                         SELECT COUNT(DISTINCT u.ac) FROM (
                           SELECT av.acompanhante_id AS ac
                           FROM   tb_avaliacoes av
                           WHERE  av.paciente_id = p.id AND av.acompanhante_id IS NOT NULL
                           UNION
                           SELECT tp.acompanhante_id
                           FROM   tb_pacientes tp
                           WHERE  tp.id = p.id AND tp.acompanhante_id IS NOT NULL
                         ) u
                       ) AS qtd_acompanhantes,
                       ult.score_final AS ultimo_score,
                       TO_CHAR(ult.data_avaliacao, 'YYYY-MM-DD') AS ultima_avaliacao,
                       ult.recomenda_exame,
                       p.ativo
                FROM   pacientes p
                JOIN   tb_pacientes ptel ON ptel.id = p.id
                LEFT JOIN usuarios med ON med.id = p.criado_por
                LEFT JOIN LATERAL (
                    SELECT a.score_final, a.data_avaliacao, a.recomenda_exame
                    FROM   avaliacoes a
                    WHERE  a.paciente_id = p.id
                      AND  a.status = 'finalizada'
                    ORDER  BY a.data_avaliacao DESC
                    LIMIT  1
                ) ult ON TRUE
                {where_clause}
                ORDER  BY p.id DESC
                LIMIT  :limit OFFSET :offset
                """
            ),
            params,
        )
        rows = result.mappings().all()
        return [
            PatientListItem(
                id=int(r["id"]),
                nome=str(r["nome"]),
                sexo=str(r["sexo"]) if r["sexo"] else None,
                data_nascimento=str(r["data_nascimento"]) if r["data_nascimento"] else None,
                cpf_hash=str(r["cpf_hash"]) if r["cpf_hash"] else None,
                telefone=str(r["telefone"]) if r["telefone"] else None,
                qtd_acompanhantes=int(r["qtd_acompanhantes"]) if r["qtd_acompanhantes"] is not None else 0,
                ultimo_score=float(r["ultimo_score"]) if r["ultimo_score"] is not None else None,
                ultima_avaliacao=str(r["ultima_avaliacao"]) if r["ultima_avaliacao"] else None,
                recomenda_exame=bool(r["recomenda_exame"]) if r["recomenda_exame"] is not None else None,
                ativo=bool(r["ativo"]),
                medico=str(r["medico"]) if r["medico"] else None,
            )
            for r in rows
        ]

    async def get_detail(
        self,
        *,
        paciente_id: int,
        restrict_to_usuario_id: int | None,
    ) -> PatientDetail | None:
        params: dict[str, object] = {"paciente_id": paciente_id}
        owner_clause = ""
        if restrict_to_usuario_id is not None:
            owner_clause = "AND p.criado_por = :usuario_id"
            params["usuario_id"] = restrict_to_usuario_id
        result = await self._session.execute(
            text(
                f"""
                SELECT p.id, p.nome, p.sexo,
                       TO_CHAR(p.data_nascimento, 'YYYY-MM-DD') AS data_nascimento,
                       p.idade_anos, p.cpf_hash,
                       p.etnia, ptel.telefone, p.municipio_residencia, p.uf_residencia,
                       p.prematuro,
                       p.escolaridade, p.tem_diagnostico_autismo, p.tem_diagnostico_tdah,
                       p.outras_comorbidades, p.medicamentos_uso,
                       p.diagnostico_confirmado_fxs
                FROM   pacientes p
                JOIN   tb_pacientes ptel ON ptel.id = p.id
                WHERE  p.id = :paciente_id {owner_clause}
                """
            ),
            params,
        )
        r = result.mappings().first()
        if r is None:
            return None

        acomp_rows = await self._session.execute(
            text(
                """
                SELECT DISTINCT ON (ac.id)
                       ac.id, ac.nome, ac.telefone, ac.email, src.relacao
                FROM (
                    SELECT tp.acompanhante_id AS acomp_id,
                           tp.grau_parentesco AS relacao, 0 AS prio
                    FROM   tb_pacientes tp
                    WHERE  tp.id = :paciente_id AND tp.acompanhante_id IS NOT NULL
                    UNION ALL
                    SELECT av.acompanhante_id, av.grau_parentesco, 1 AS prio
                    FROM   tb_avaliacoes av
                    WHERE  av.paciente_id = :paciente_id
                      AND  av.acompanhante_id IS NOT NULL
                ) src
                JOIN acompanhantes ac ON ac.id = src.acomp_id
                ORDER BY ac.id, src.prio
                """
            ),
            {"paciente_id": paciente_id},
        )
        acompanhantes: list[AcompanhanteDetail] = [
            AcompanhanteDetail(
                id=int(ar["id"]),
                nome=str(ar["nome"]) if ar["nome"] else "—",
                relacao=str(ar["relacao"]) if ar["relacao"] else None,
                telefone=str(ar["telefone"]) if ar["telefone"] else None,
                email=str(ar["email"]) if ar["email"] else None,
            )
            for ar in acomp_rows.mappings().all()
        ]

        def _num(v: object) -> int | None:
            return int(v) if v is not None else None

        def _bool(v: object) -> bool | None:
            return bool(v) if v is not None else None

        def _str(v: object) -> str | None:
            return str(v) if v else None

        return PatientDetail(
            id=int(r["id"]),
            nome=str(r["nome"]),
            sexo=_str(r["sexo"]),
            data_nascimento=_str(r["data_nascimento"]),
            idade_anos=_num(r["idade_anos"]),
            cpf_hash=_str(r["cpf_hash"]),
            etnia=_str(r["etnia"]),
            telefone=_str(r["telefone"]),
            municipio_residencia=_str(r["municipio_residencia"]),
            uf_residencia=_str(r["uf_residencia"]),
            prematuro=_bool(r["prematuro"]),
            escolaridade=_str(r["escolaridade"]),
            tem_diagnostico_autismo=_bool(r["tem_diagnostico_autismo"]),
            tem_diagnostico_tdah=_bool(r["tem_diagnostico_tdah"]),
            outras_comorbidades=_str(r["outras_comorbidades"]),
            medicamentos_uso=_str(r["medicamentos_uso"]),
            diagnostico_confirmado_fxs=_bool(r["diagnostico_confirmado_fxs"]),
            acompanhantes=acompanhantes,
        )

    async def count_by_doctor(
        self,
        *,
        restrict_to_usuario_id: int | None,
        nome_filter: str | None = None,
        cpf_hash_filter: str | None = None,
        incluir_inativos: bool = False,
    ) -> int:
        conditions: list[str] = []
        params: dict[str, object] = {}
        if restrict_to_usuario_id is not None:
            conditions.append("criado_por = :usuario_id")
            params["usuario_id"] = restrict_to_usuario_id
        if not incluir_inativos:
            conditions.append("ativo = TRUE")
        if nome_filter:
            conditions.append("nome ILIKE :nome_filter")
            params["nome_filter"] = f"%{nome_filter}%"
        if cpf_hash_filter:
            conditions.append("cpf_hash = :cpf_hash_filter")
            params["cpf_hash_filter"] = cpf_hash_filter

        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        result = await self._session.execute(
            text(f"SELECT COUNT(*) AS total FROM pacientes {where_clause}"),
            params,
        )
        row = result.mappings().first()
        return int(row["total"]) if row else 0
