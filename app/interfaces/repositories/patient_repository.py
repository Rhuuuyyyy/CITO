"""Concrete adapter: persists Patient via the 'pacientes' DB view.

The view's INSTEAD OF trigger encrypts ``nome`` into ``nome_criptografado``.
Identity is the integer SERIAL ``id`` (no UUID column exists in the schema).
"""
from typing import cast

from sqlalchemy import text
from sqlalchemy.engine import RowMapping
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.patient import Escolaridade, Etnia, Patient, SexAtBirth
from app.domain.value_objects.cpf import CPF

_PATIENT_COLUMNS = """
    id, nome, cpf_hash, data_nascimento, sexo,
    etnia, uf_nascimento, municipio_residencia,
    uf_residencia, prematuro, idade_gestacional_semanas,
    peso_nascimento_gramas, escolaridade,
    tem_diagnostico_autismo, tem_diagnostico_tdah,
    outras_comorbidades, medicamentos_uso,
    acompanhante_id, grau_parentesco,
    diagnostico_confirmado_fxs, criado_por, criado_em
"""


class PatientRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, patient: Patient) -> Patient:
        """Persist a new patient and return the entity with its DB id populated."""
        result = await self._session.execute(
            text(
                """
                INSERT INTO pacientes (
                    nome, cpf_hash, data_nascimento, sexo,
                    etnia, uf_nascimento, municipio_residencia,
                    uf_residencia, prematuro, idade_gestacional_semanas,
                    peso_nascimento_gramas, escolaridade,
                    tem_diagnostico_autismo, tem_diagnostico_tdah,
                    outras_comorbidades, medicamentos_uso, acompanhante_id,
                    grau_parentesco, diagnostico_confirmado_fxs, criado_por
                ) VALUES (
                    :nome, :cpf_hash, :data_nascimento, :sexo,
                    :etnia, :uf_nascimento, :municipio_residencia,
                    :uf_residencia, :prematuro, :idade_gestacional_semanas,
                    :peso_nascimento_gramas, :escolaridade,
                    :tem_diagnostico_autismo, :tem_diagnostico_tdah,
                    :outras_comorbidades, :medicamentos_uso, :acompanhante_id,
                    :grau_parentesco, :diagnostico_confirmado_fxs, :criado_por
                )
                RETURNING id
                """
            ),
            {
                "nome": patient.full_name,
                "cpf_hash": patient.cpf.sha256_hex if patient.cpf else None,
                "data_nascimento": patient.birth_date,
                "sexo": patient.sex_at_birth.value,
                "criado_por": patient.criado_por_db_id,
                "etnia": patient.etnia.value if patient.etnia else None,
                "uf_nascimento": patient.uf_nascimento,
                "municipio_residencia": patient.municipio_residencia,
                "uf_residencia": patient.uf_residencia,
                "prematuro": patient.prematuro,
                "idade_gestacional_semanas": patient.idade_gestacional_semanas,
                "peso_nascimento_gramas": patient.peso_nascimento_gramas,
                "escolaridade": patient.escolaridade.value
                if patient.escolaridade else None,
                "tem_diagnostico_autismo": patient.tem_diagnostico_autismo,
                "tem_diagnostico_tdah": patient.tem_diagnostico_tdah,
                "outras_comorbidades": patient.outras_comorbidades,
                "medicamentos_uso": patient.medicamentos_uso,
                "acompanhante_id": patient.acompanhante_id,
                "grau_parentesco": patient.grau_parentesco,
                "diagnostico_confirmado_fxs": patient.diagnostico_confirmado_fxs,
            },
        )
        row = result.mappings().first()
        if row is None:
            raise RuntimeError(
                "Falha ao inserir paciente — RETURNING id não retornou valor"
            )
        return patient.model_copy(update={"id": int(row["id"])})

    async def get_by_id(self, entity_id: int) -> Patient | None:
        """Look up a patient by integer DB id."""
        result = await self._session.execute(
            text(f"SELECT {_PATIENT_COLUMNS} FROM pacientes WHERE id = :id"),
            {"id": entity_id},
        )
        row = result.mappings().first()
        return self._row_to_patient(row) if row is not None else None

    async def get_by_cpf(self, cpf: CPF) -> Patient | None:
        result = await self._session.execute(
            text(f"SELECT {_PATIENT_COLUMNS} FROM pacientes WHERE cpf_hash = :cpf_hash"),
            {"cpf_hash": cpf.sha256_hex},
        )
        row = result.mappings().first()
        return self._row_to_patient(row) if row is not None else None

    async def belongs_to(self, *, paciente_id: int, usuario_id: int) -> bool:
        """True if the patient exists and was registered by this doctor."""
        result = await self._session.execute(
            text(
                "SELECT 1 FROM tb_pacientes WHERE id = :id AND criado_por = :uid"
            ),
            {"id": paciente_id, "uid": usuario_id},
        )
        return result.first() is not None

    async def set_ativo(
        self, *, paciente_id: int, usuario_id: int, ativo: bool
    ) -> bool:
        """Archive (ativo=FALSE) or restore (ativo=TRUE) a patient owned by the
        doctor. Returns True if a row was updated."""
        result = await self._session.execute(
            text(
                """
                UPDATE tb_pacientes SET ativo = :ativo
                WHERE id = :id AND criado_por = :uid
                RETURNING id
                """
            ),
            {"ativo": ativo, "id": paciente_id, "uid": usuario_id},
        )
        return result.first() is not None

    async def delete_cascade(
        self, *, paciente_id: int, usuario_id: int
    ) -> bool:
        """Permanently delete a patient and ALL dependent records.

        Order matters (no ON DELETE CASCADE in the schema): children of each
        evaluation → evaluations → appointments → the patient. The caller must
        confirm ownership first; the final delete is also scoped by criado_por.
        The acompanhante is intentionally left (it may be shared by other
        patients). Runs inside the request transaction (rolls back on error).
        """
        sub = "SELECT id FROM tb_avaliacoes WHERE paciente_id = :pid"
        for child in (
            "respostas_checklist",
            "tb_historico_familiar",
            "tb_encaminhamentos",
            "tb_log_analises",
        ):
            await self._session.execute(
                text(f"DELETE FROM {child} WHERE avaliacao_id IN ({sub})"),
                {"pid": paciente_id},
            )
        await self._session.execute(
            text("DELETE FROM tb_avaliacoes WHERE paciente_id = :pid"),
            {"pid": paciente_id},
        )
        await self._session.execute(
            text("DELETE FROM tb_agendamentos WHERE paciente_id = :pid"),
            {"pid": paciente_id},
        )
        result = await self._session.execute(
            text(
                "DELETE FROM tb_pacientes WHERE id = :pid AND criado_por = :uid "
                "RETURNING id"
            ),
            {"pid": paciente_id, "uid": usuario_id},
        )
        return result.first() is not None

    def _row_to_patient(self, row: RowMapping) -> Patient:
        raw_escolaridade = cast("str | None", row["escolaridade"])
        raw_etnia = cast("str | None", row["etnia"])
        raw_acompanhante_id = row["acompanhante_id"]

        return Patient(
            id=int(row["id"]),
            cpf=None,
            full_name=cast(str, row["nome"]),
            birth_date=cast(object, row["data_nascimento"]),  # type: ignore[arg-type]
            sex_at_birth=SexAtBirth(cast(str, row["sexo"])),
            criado_por_db_id=cast(int, row["criado_por"]),
            etnia=Etnia(raw_etnia) if raw_etnia else None,
            uf_nascimento=cast("str | None", row["uf_nascimento"]),
            municipio_residencia=cast("str | None", row["municipio_residencia"]),
            uf_residencia=cast("str | None", row["uf_residencia"]),
            prematuro=cast(bool, row["prematuro"]),
            idade_gestacional_semanas=cast("int | None", row["idade_gestacional_semanas"]),
            peso_nascimento_gramas=cast("float | None", row["peso_nascimento_gramas"]),
            escolaridade=Escolaridade(raw_escolaridade) if raw_escolaridade else None,
            tem_diagnostico_autismo=cast(bool, row["tem_diagnostico_autismo"]),
            tem_diagnostico_tdah=cast(bool, row["tem_diagnostico_tdah"]),
            outras_comorbidades=cast("str | None", row["outras_comorbidades"]),
            medicamentos_uso=cast("str | None", row["medicamentos_uso"]),
            acompanhante_id=int(raw_acompanhante_id) if raw_acompanhante_id is not None else None,
            grau_parentesco=cast("str | None", row["grau_parentesco"]),
            diagnostico_confirmado_fxs=bool(row["diagnostico_confirmado_fxs"]),
            created_at=cast(object, row["criado_em"]),  # type: ignore[arg-type]
        )
