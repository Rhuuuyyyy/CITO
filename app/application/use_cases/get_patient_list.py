"""GetPatientListUseCase — list patients registered by the authenticated doctor.

CPF anonymity rule:
  - Raw CPF digits are hashed to SHA-256 HERE in the use case.
  - The repository never receives raw CPF — only sha256_hex.
  - This ensures the hashing rule is testable without a real DB.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.domain.value_objects.cpf import CPF
from app.interfaces.repositories.patient_read_repository import (
    PatientListItem,
    PatientReadRepository,
)


@dataclass(frozen=True)
class PatientListResult:
    items: list[PatientListItem]
    total: int
    limit: int
    offset: int


class GetPatientListUseCase:
    """Returns a paginated list of patients registered by the requesting doctor.

    Search behaviour:
      - nome: partial ILIKE match (case-insensitive).
      - cpf: raw digits accepted, hashed to SHA-256 before querying.
             If the raw CPF is invalid, CPF() raises ValueError — let it propagate.
      - Both filters can be combined (AND semantics).
    """

    HARD_LIMIT: int = 200

    def __init__(self, patients: PatientReadRepository) -> None:
        self._patients = patients

    async def execute(
        self,
        *,
        usuario_id: int,
        nome_filter: str | None = None,
        cpf_raw_filter: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> PatientListResult:
        """Fetch paginated patient list for one doctor.

        Args:
            usuario_id: Authenticated doctor's DB integer id.
            nome_filter: Optional partial name search term.
            cpf_raw_filter: Optional raw CPF digits (will be hashed internally).
            limit: Page size; capped at HARD_LIMIT.
            offset: Pagination offset.

        Returns:
            PatientListResult with items and total count.
        """
        if limit > self.HARD_LIMIT:
            limit = self.HARD_LIMIT

        # Hash CPF here — repository never sees raw digits.
        cpf_hash_filter: str | None = None
        if cpf_raw_filter:
            cpf_hash_filter = CPF(cpf_raw_filter).sha256_hex

        total = await self._patients.count_by_doctor(
            usuario_id=usuario_id,
            nome_filter=nome_filter,
            cpf_hash_filter=cpf_hash_filter,
        )
        items = await self._patients.list_by_doctor(
            usuario_id=usuario_id,
            nome_filter=nome_filter,
            cpf_hash_filter=cpf_hash_filter,
            limit=limit,
            offset=offset,
        )
        return PatientListResult(items=items, total=total, limit=limit, offset=offset)