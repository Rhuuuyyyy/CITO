"""UpdatePatientUseCase — edit an existing patient's demographic/clinical data.

HTTP-blind: raises domain/ValueError exceptions, never HTTPException.
RBAC: a doctor edits only their own patients; an admin edits any.
"""
from __future__ import annotations

from sqlalchemy.exc import IntegrityError

from app.core.exceptions import ConflictError, NotFoundError
from app.domain.entities.patient import Escolaridade, Etnia, SexAtBirth
from app.domain.value_objects.cpf import CPF
from app.interfaces.repositories.patient_repository import PatientRepository
from app.presentation.api.v1.schemas.patient import PatientUpdateRequest


class UpdatePatientUseCase:
    """Updates a patient's editable fields. The caregiver(s) are managed per
    evaluation (model B), so they are intentionally out of scope here."""

    def __init__(self, patients: PatientRepository) -> None:
        self._patients = patients

    async def execute(
        self,
        *,
        paciente_id: int,
        usuario_id: int,
        is_admin: bool,
        request: PatientUpdateRequest,
    ) -> None:
        # Validate value objects / enums (raise ValueError on bad input).
        sexo = SexAtBirth(request.sexo.upper()).value
        etnia = Etnia(request.etnia.lower()).value if request.etnia else None
        escolaridade = (
            Escolaridade(request.escolaridade).value if request.escolaridade else None
        )

        atualizar_cpf = bool(request.cpf)
        cpf_hash = CPF(request.cpf).sha256_hex if request.cpf else None

        try:
            updated = await self._patients.update(
                paciente_id=paciente_id,
                usuario_id=usuario_id,
                is_admin=is_admin,
                nome=request.nome,
                cpf_hash=cpf_hash,
                atualizar_cpf=atualizar_cpf,
                data_nascimento=request.data_nascimento,
                sexo=sexo,
                etnia=etnia,
                telefone=request.telefone,
                municipio_residencia=request.municipio_residencia,
                uf_residencia=request.uf_residencia,
                prematuro=request.prematuro,
                escolaridade=escolaridade,
                tem_diagnostico_autismo=request.tem_diagnostico_autismo,
                tem_diagnostico_tdah=request.tem_diagnostico_tdah,
                outras_comorbidades=request.outras_comorbidades,
                medicamentos_uso=request.medicamentos_uso,
                diagnostico_confirmado_fxs=request.diagnostico_confirmado_fxs,
            )
        except IntegrityError as exc:
            # Quase sempre o UNIQUE de cpf_hash (CPF já usado por outro paciente).
            raise ConflictError("Já existe um paciente com este CPF.") from exc

        if not updated:
            raise NotFoundError("Paciente não encontrado.")
