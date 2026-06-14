from __future__ import annotations

from app.domain.entities.acompanhante import Acompanhante
from app.domain.entities.patient import Escolaridade, Etnia, Patient, SexAtBirth
from app.domain.value_objects.cpf import CPF
from app.interfaces.repositories.acompanhante_repository import AcompanhanteRepository
from app.interfaces.repositories.patient_repository import PatientRepository
from app.presentation.api.v1.schemas.patient import PatientCreateRequest


class RegisterPatientUseCase:

    def __init__(
        self,
        patients: PatientRepository,
        acompanhantes: AcompanhanteRepository,
    ) -> None:
        self._patients = patients
        self._acompanhantes = acompanhantes

    async def execute(
        self,
        *,
        request: PatientCreateRequest,
        usuario_db_id: int,
    ) -> Patient:
        acompanhante_id = None
        if request.acompanhante is not None:
            acomp_cpf = CPF(request.acompanhante.cpf) if request.acompanhante.cpf else None

            existing: Acompanhante | None = None
            if acomp_cpf:
                existing = await self._acompanhantes.get_by_cpf(acomp_cpf)

            if existing is None:
                new_acomp = Acompanhante(
                    nome=request.acompanhante.nome,
                    cpf=acomp_cpf,
                    telefone=request.acompanhante.telefone,
                    email=request.acompanhante.email,
                )
                saved_acomp = await self._acompanhantes.add(new_acomp)
                acompanhante_id = saved_acomp.id
            else:
                acompanhante_id = existing.id

        grau_parentesco = (
            request.acompanhante.relacao if request.acompanhante is not None else None
        )

        patient_cpf = CPF(request.cpf) if request.cpf else None

        patient = Patient(
            cpf=patient_cpf,
            full_name=request.nome,
            birth_date=request.data_nascimento,
            sex_at_birth=SexAtBirth(request.sexo.upper()),
            etnia=Etnia(request.etnia.lower()) if request.etnia else None,
            telefone=request.telefone,
            municipio_residencia=request.municipio_residencia,
            uf_residencia=request.uf_residencia,
            prematuro=request.prematuro,
            escolaridade=Escolaridade(request.escolaridade) if request.escolaridade else None,
            tem_diagnostico_autismo=request.tem_diagnostico_autismo,
            tem_diagnostico_tdah=request.tem_diagnostico_tdah,
            outras_comorbidades=request.outras_comorbidades,
            medicamentos_uso=request.medicamentos_uso,
            grau_parentesco=grau_parentesco,
            diagnostico_confirmado_fxs=request.diagnostico_confirmado_fxs,
            acompanhante_id=acompanhante_id,
            criado_por_db_id=usuario_db_id,
            family_history_fxs=False,
        )

        return await self._patients.add(patient)