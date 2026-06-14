from typing import Protocol
from uuid import UUID

from app.domain.entities.checklist_response import ChecklistResponse


class IChecklistResponseRepository(Protocol):

    async def get(self, response_id: UUID) -> ChecklistResponse | None: ...

    async def get_by_evaluation(
        self, evaluation_id: UUID
    ) -> ChecklistResponse | None: ...

    async def add(self, response: ChecklistResponse) -> ChecklistResponse: ...

    async def update(self, response: ChecklistResponse) -> ChecklistResponse: ...