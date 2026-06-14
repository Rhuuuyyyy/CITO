from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


class ScoreBand(StrEnum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


class Recommendation(StrEnum):
    NONE = "none"
    FOLLOW_UP = "follow_up"
    GENETIC_TEST = "genetic_test"
    THERAPY_REFERRAL = "therapy_referral"


class Evaluation(BaseModel):

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    id: UUID = Field(default_factory=uuid4)
    patient_id: UUID
    doctor_id: UUID
    consultation_date: datetime
    chief_complaint: str = Field(default="", max_length=2000)
    clinical_observations: str = Field(default="", max_length=4000)
    score_value: int | None = Field(default=None, ge=0)
    score_band: ScoreBand | None = None
    recommendation: Recommendation = Recommendation.NONE
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC)
    )

    def attach_score(
        self,
        *,
        value: int,
        band: ScoreBand,
        recommendation: Recommendation,
    ) -> None:
        self.score_value = value
        self.score_band = band
        self.recommendation = recommendation
        self.updated_at = datetime.now(UTC)

    @property
    def is_scored(self) -> bool:
        return self.score_value is not None and self.score_band is not None