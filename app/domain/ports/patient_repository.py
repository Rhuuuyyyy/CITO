"""Persistence port for the Patient aggregate."""
from typing import Protocol
from uuid import UUID

from app.domain.entities.patient import Patient


class IPatientRepository(Protocol):
    """Contract every concrete Patient persistence adapter must satisfy."""

    async def get(self, patient_id: UUID) -> Patient | None: ...

    async def get_by_cpf(self, cpf: str) -> Patient | None: ...

    async def add(self, patient: Patient) -> Patient: ...

    async def update(self, patient: Patient) -> Patient: ...

    async def list_by_doctor(
        self,
        doctor_id: UUID,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Patient]: ...