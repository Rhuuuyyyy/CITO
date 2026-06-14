from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.get_symptoms import GetSymptomsUseCase
from app.db.database import get_db_session
from app.interfaces.api.dependencies import AuthenticatedDoctor, get_current_doctor
from app.interfaces.repositories.symptom_repository import SymptomReadRepository
from app.presentation.api.v1.schemas.symptom import SintomaSchema

router = APIRouter(prefix="/sintomas", tags=["Sintomas"])


@router.get(
    "",
    response_model=list[SintomaSchema],
    summary="Catálogo de sintomas ativos",
)
async def list_sintomas(
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
    session: AsyncSession = Depends(get_db_session),
) -> list[SintomaSchema]:
    use_case = GetSymptomsUseCase(symptoms=SymptomReadRepository(session))
    items = await use_case.execute()
    return [SintomaSchema(id=item.id, descricao=item.descricao) for item in items]
