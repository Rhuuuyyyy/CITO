"""Concrete adapter: persists Patient via the 'pacientes' DB view."""
from typing import cast
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.patient import Escolaridade, Etnia, Patient, SexAtBirth
from app.domain.value_objects.cpf import CPF


class PatientRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, patient: Patient) -> Patient:
        """Persist a new patient and return the entity with db_id populated."""
        result = await self._session.execute(
            text(
                """
                INSERT INTO pacientes (
                    uuid, nome, cpf_hash, data_nascimento, sexo,
                    etnia, uf_nascimento, municipio_residencia,
                    uf_residencia, prematuro, idade_gestacional_semanas,
                    peso_nascimento_gramas, escolaridade,
                    tem_diagnostico_autismo, tem_diagnostico_tdah,
                    outras_comorbidades, medicamentos_uso, acompanhante_id,
                    grau_parentesco, diagnostico_confirmado_fxs,
                    criado_por, criado_em
                ) VALUES (
                    :uuid, :nome, :cpf_hash, :data_nascimento, :sexo,
                    :etnia, :uf_nascimento, :municipio_residencia,
                    :uf_residencia, :prematuro, :idade_gestacional_semanas,
                    :peso_nascimento_gramas, :escolaridade,
                    :tem_diagnostico_autismo, :tem_diagnostico_tdah,
                    :outras_comorbidades, :medicamentos_uso, :acompanhante_id,
                    :grau_parentesco, :diagnostico_confirmado_fxs,
                    :criado_por, :criado_em
                )
                RETURNING id
                """
            ),
            {
                "uuid": str(patient.id),
                "nome": patient.full_name,
                "cpf_hash": patient.cpf.sha256_hex if patient.cpf else None,
                "data_nascimento": patient.birth_date.isoformat(),
                "sexo": patient.sex_at_birth.value,
                "criado_por": patient.criado_por_db_id,
                "etnia": patient.etnia.value,
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
                "acompanhante_id": str(patient.acompanhante_id)
                if patient.acompanhante_id else None,
                "grau_parentesco": patient.grau_parentesco,
                "diagnostico_confirmado_fxs": patient.diagnostico_confirmado_fxs,
                "criado_em": patient.created_at.isoformat(),
            },
        )
        row = result.mappings().first()
        if row is None:
            raise RuntimeError(
                "Falha ao inserir paciente — RETURNING id não retornou valor"
            )
        return patient.model_copy(update={"db_id": int(row["id"])})

    async def get_by_id(self, entity_id: UUID) -> Patient | None:
        """Look up a patient by domain UUID (not BIGSERIAL)."""
        result = await self._session.execute(
            text(
                """
                SELECT id, uuid, nome, cpf_hash, data_nascimento, sexo,
                       etnia, uf_nascimento, municipio_residencia,
                       uf_residencia, prematuro, idade_gestacional_semanas,
                       peso_nascimento_gramas, escolaridade,
                       tem_diagnostico_autismo, tem_diagnostico_tdah,
                       outras_comorbidades, medicamentos_uso,
                       acompanhante_id, grau_parentesco,
                       diagnostico_confirmado_fxs, criado_por, criado_em
                FROM pacientes WHERE uuid = :uuid
                """
            ),
            {"uuid": str(entity_id)},
        )
        row = result.mappings().first()
        if row is None:
            return None
        return self._row_to_patient(row)

    async def get_by_cpf(self, cpf: CPF) -> Patient | None:
        result = await self._session.execute(
            text(
                """
                SELECT id, uuid, nome, cpf_hash, data_nascimento, sexo,
                       etnia, uf_nascimento, municipio_residencia,
                       uf_residencia, prematuro, idade_gestacional_semanas,
                       peso_nascimento_gramas, escolaridade,
                       tem_diagnostico_autismo, tem_diagnostico_tdah,
                       outras_comorbidades, medicamentos_uso,
                       acompanhante_id, grau_parentesco,
                       diagnostico_confirmado_fxs, criado_por, criado_em
                FROM pacientes WHERE cpf_hash = :cpf_hash
                """
            ),
            {"cpf_hash": cpf.sha256_hex},
        )
        row = result.mappings().first()
        if row is None:
            return None
        return self._row_to_patient(row)

    def _row_to_patient(self, row: object) -> Patient:
        from sqlalchemy.engine import RowMapping

        r = cast(RowMapping, row)
        raw_escolaridade = cast("str | None", r["escolaridade"])
        raw_acompanhante_id = cast("str | None", r["acompanhante_id"])

        return Patient(
            id=UUID(str(r["uuid"])),
            db_id=int(r["id"]),
            cpf=None,
            full_name=cast(str, r["nome"]),
            birth_date=cast(object, r["data_nascimento"]),  # type: ignore[arg-type]
            sex_at_birth=SexAtBirth(cast(str, r["sexo"])),
            criado_por_db_id=cast(int, r["criado_por"]),
            etnia=Etnia(cast(str, r["etnia"])),
            uf_nascimento=cast(str, r["uf_nascimento"]),
            municipio_residencia=cast(str, r["municipio_residencia"]),
            uf_residencia=cast(str, r["uf_residencia"]),
            prematuro=cast(bool, r["prematuro"]),
            idade_gestacional_semanas=cast("int | None", r["idade_gestacional_semanas"]),
            peso_nascimento_gramas=cast("float | None", r["peso_nascimento_gramas"]),
            escolaridade=Escolaridade(raw_escolaridade) if raw_escolaridade else None,
            tem_diagnostico_autismo=cast(bool, r["tem_diagnostico_autismo"]),
            tem_diagnostico_tdah=cast(bool, r["tem_diagnostico_tdah"]),
            outras_comorbidades=cast("str | None", r["outras_comorbidades"]),
            medicamentos_uso=cast("str | None", r["medicamentos_uso"]),
            acompanhante_id=UUID(raw_acompanhante_id) if raw_acompanhante_id else None,
            grau_parentesco=cast("str | None", r["grau_parentesco"]),
            diagnostico_confirmado_fxs=cast("bool | None", r["diagnostico_confirmado_fxs"]),
            created_at=cast(object, r["criado_em"]),  # type: ignore[arg-type]
        )