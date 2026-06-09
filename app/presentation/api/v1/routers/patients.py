"""HTTP router for patient registration and listing."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.get_patient_list import GetPatientListUseCase
from app.application.use_cases.register_patient import RegisterPatientUseCase
from app.db.database import get_db_session
from app.interfaces.api.dependencies import AuthenticatedDoctor, get_current_doctor
from app.interfaces.repositories.acompanhante_repository import AcompanhanteRepository
from app.interfaces.repositories.patient_read_repository import PatientReadRepository
from app.interfaces.repositories.patient_repository import PatientRepository
from app.presentation.api.v1.masking import CPF_MASK
from app.presentation.api.v1.schemas.patient import (
    PatientCreateRequest,
    PatientListItemSchema,
    PatientListResponse,
    PatientResponse,
)

router = APIRouter(prefix="/pacientes", tags=["Pacientes"])


@router.post(
    "",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar novo paciente",
)
async def register_patient(
    payload: PatientCreateRequest,
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
    session: AsyncSession = Depends(get_db_session),
) -> PatientResponse:
    use_case = RegisterPatientUseCase(
        patients=PatientRepository(session),
        acompanhantes=AcompanhanteRepository(session),
    )

    try:
        patient = await use_case.execute(
            request=payload,
            usuario_db_id=doctor.usuario_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if patient.id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha interna ao recuperar ID do paciente após inserção.",
        )

    return PatientResponse(
        id=patient.id,
        nome_masked=patient.full_name,
        sexo=patient.sex_at_birth.value,
        etnia=patient.etnia.value if patient.etnia else None,
        uf_residencia=patient.uf_residencia,
        criado_por_db_id=patient.criado_por_db_id,
    )


@router.get(
    "",
    response_model=PatientListResponse,
    summary="Listar pacientes do médico logado",
)
async def list_patients(
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
    session: AsyncSession = Depends(get_db_session),
    nome: str | None = Query(default=None, description="Busca parcial por nome"),
    cpf: str | None = Query(default=None, description="CPF em dígitos"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> PatientListResponse:
    use_case = GetPatientListUseCase(patients=PatientReadRepository(session))
    result = await use_case.execute(
        usuario_id=doctor.usuario_id,
        nome_filter=nome,
        cpf_raw_filter=cpf,
        limit=limit,
        offset=offset,
    )
    return PatientListResponse(
        items=[
            PatientListItemSchema(
                id=item.id,
                nome=item.nome,
                sexo=item.sexo,
                data_nascimento=item.data_nascimento,
                cpf_masked=CPF_MASK if item.cpf_hash else None,
                telefone=item.telefone,
                tem_acompanhante=item.tem_acompanhante,
                ultimo_score=item.ultimo_score,
                ultima_avaliacao=item.ultima_avaliacao,
                recomenda_exame=item.recomenda_exame,
            )
            for item in result.items
        ],
        total=result.total,
        limit=result.limit,
        offset=result.offset,
    )
