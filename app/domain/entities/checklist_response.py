"""ChecklistResponse domain entity (anamnesis form belonging to one Evaluation)."""
from datetime import UTC, datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from app.domain.entities.evaluation import ScoreBand


class ChecklistItem(BaseModel):
    """One answered item inside a ChecklistResponse.

    Carries a reference to the Symptom (by id, never embedded), the
    boolean answer, and free-text notes the doctor may add.
    """

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    symptom_id: UUID
    is_present: bool
    notes: str = Field(default="", max_length=500)


class ChecklistResponse(BaseModel):
    """Anamnesis form filled in during an Evaluation.

    Holds the per-symptom answers and the computed total score. The actual
    score computation belongs to a future domain service so that the
    entity stays pure data + invariants.
    """

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    id: UUID = Field(default_factory=uuid4)
    evaluation_id: UUID
    items: list[ChecklistItem] = Field(default_factory=list)
    total_score: int = Field(default=0, ge=0)
    score_band: ScoreBand | None = None
    submitted_by_user_id: UUID
    submitted_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC)
    )

    def add_item(self, item: ChecklistItem) -> None:
        if any(existing.symptom_id == item.symptom_id for existing in self.items):
            raise ValueError(
                f"Symptom {item.symptom_id} is already answered in this response."
            )
        self.items.append(item)

    @property
    def positive_count(self) -> int:
        return sum(1 for item in self.items if item.is_present)