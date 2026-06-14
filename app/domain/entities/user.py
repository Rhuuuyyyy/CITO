from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, model_validator


class UserRole(StrEnum):

    DOCTOR = "doctor"
    ADMIN = "admin"


class User(BaseModel):

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    id: UUID = Field(default_factory=uuid4)
    email: str = Field(min_length=3, max_length=254)
    full_name: str = Field(min_length=2, max_length=120)
    role: UserRole
    password_hash: str = Field(min_length=1)
    crm: str | None = Field(default=None, max_length=20)
    is_active: bool = True
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC)
    )
    last_login_at: datetime | None = None

    @model_validator(mode="after")
    def _doctor_must_have_crm(self) -> "User":
        if self.role is UserRole.DOCTOR and not self.crm:
            raise ValueError("crm is required when role is DOCTOR")
        return self

    def has_role(self, required: UserRole) -> bool:
        return self.is_active and self.role is required

    def deactivate(self) -> None:
        self.is_active = False

    def record_login(self, *, when: datetime | None = None) -> None:
        self.last_login_at = when or datetime.now(UTC)