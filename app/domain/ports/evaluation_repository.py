from typing import Protocol
from uuid import UUID

from app.domain.entities.evaluation import Evaluation


class IEvaluationRepository(Protocol):

    async def get(self, evaluation_id: UUID) -> Evaluation | None: ...

    async def add(self, evaluation: Evaluation) -> Evaluation: ...

    async def update(self, evaluation: Evaluation) -> Evaluation: ...

    async def list_by_patient(
        self, patient_id: UUID
    ) -> list[Evaluation]: ...

    async def list_by_doctor(
        self,
        doctor_id: UUID,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Evaluation]: ...