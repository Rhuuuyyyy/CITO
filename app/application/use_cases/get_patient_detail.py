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
        is_admin: bool = False,
    ) -> PatientDetail | None:
        # Admin pode abrir qualquer paciente; médico só os seus.
        restrict_to = None if is_admin else usuario_id
        return await self._patients.get_detail(
            paciente_id=paciente_id,
            restrict_to_usuario_id=restrict_to,
        )
