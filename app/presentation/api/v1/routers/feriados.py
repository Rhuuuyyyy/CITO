from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends

from app.application.use_cases.get_feriados import GetFeriadosUseCase
from app.interfaces.api.dependencies import AuthenticatedDoctor, get_current_doctor
from app.interfaces.external.feriados_client import FeriadosClient
from app.presentation.api.v1.schemas.feriado import FeriadoSchema

router = APIRouter(prefix="/feriados", tags=["Feriados"])


@router.get(
    "/{ano}",
    response_model=list[FeriadoSchema],
    summary="Feriados nacionais do ano",
)
async def list_feriados(
    ano: int,
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
) -> list[FeriadoSchema]:
    if ano < 1900 or ano > date.today().year + 5:
        return []
    use_case = GetFeriadosUseCase(client=FeriadosClient())
    items = await use_case.execute(ano)
    return [FeriadoSchema(**item) for item in items]
