"""GetPatientDetailUseCase — full record of one patient owned by the doctor."""
from __future__ import annotations

from app.interfaces.repositories.patient_read_repository import (
    PatientDetail,
    PatientReadRepository,
)


class GetPatientDetailUseCase:
    """Returns the full detail of a single patient, scoped to the requesting doctor.

    Returns None when the patient does not exist or was not registered by the
    requesting doctor (the router maps None to HTTP 404).
    """

    def __init__(self, patients: PatientReadRepository) -> None:
        self._patients = patients

    async def execute(
        self,
        *,
        paciente_id: int,
        usuario_id: int,
    ) -> PatientDetail | None:
        return await self._patients.get_detail(
            paciente_id=paciente_id,
            usuario_id=usuario_id,
        )
