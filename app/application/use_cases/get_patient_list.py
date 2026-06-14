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

    HARD_LIMIT: int = 200

    def __init__(self, patients: PatientReadRepository) -> None:
        self._patients = patients

    async def execute(
        self,
        *,
        usuario_id: int,
        is_admin: bool = False,
        medico_id: int | None = None,
        nome_filter: str | None = None,
        cpf_raw_filter: str | None = None,
        incluir_inativos: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> PatientListResult:
        if limit > self.HARD_LIMIT:
            limit = self.HARD_LIMIT

        restrict_to = medico_id if is_admin else usuario_id

        cpf_hash_filter: str | None = None
        if cpf_raw_filter:
            cpf_hash_filter = CPF(cpf_raw_filter).sha256_hex

        total = await self._patients.count_by_doctor(
            restrict_to_usuario_id=restrict_to,
            nome_filter=nome_filter,
            cpf_hash_filter=cpf_hash_filter,
            incluir_inativos=incluir_inativos,
        )
        items = await self._patients.list_by_doctor(
            restrict_to_usuario_id=restrict_to,
            nome_filter=nome_filter,
            cpf_hash_filter=cpf_hash_filter,
            incluir_inativos=incluir_inativos,
            limit=limit,
            offset=offset,
        )
        return PatientListResult(items=items, total=total, limit=limit, offset=offset)