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
