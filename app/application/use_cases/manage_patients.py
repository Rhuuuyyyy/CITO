"""Use cases for archiving and permanently deleting a doctor's own patients."""
from __future__ import annotations

from app.core.exceptions import DomainError, NotFoundError
from app.interfaces.repositories.patient_repository import PatientRepository
from app.interfaces.repositories.user_repository import UserRepository


class SetPacienteAtivoUseCase:
    """Archive (ativo=FALSE) or restore (ativo=TRUE) a patient. Owning doctor only."""

    def __init__(self, patients: PatientRepository) -> None:
        self._patients = patients

    async def execute(
        self,
        *,
        paciente_id: int,
        usuario_id: int,
        ativo: bool,
        is_admin: bool = False,
    ) -> None:
        updated = await self._patients.set_ativo(
            paciente_id=paciente_id,
            usuario_id=usuario_id,
            ativo=ativo,
            is_admin=is_admin,
        )
        if not updated:
            raise NotFoundError("Paciente não encontrado.")


class DeletePacienteUseCase:
    """Permanently delete a patient and all dependent records (evaluations,
    answers, family history, referrals, analysis logs, appointments).

    Confirmed with the requesting doctor's own password. A wrong password raises
    DomainError (HTTP 422) — never 401, which the frontend treats as session
    expiry and would log the doctor out.
    """

    def __init__(
        self,
        patients: PatientRepository,
        users: UserRepository,
    ) -> None:
        self._patients = patients
        self._users = users

    async def execute(
        self,
        *,
        paciente_id: int,
        usuario_id: int,
        senha: str,
        is_admin: bool = False,
    ) -> None:
        if not await self._users.verify_password(
            user_id=usuario_id, senha_plain=senha
        ):
            raise DomainError("Senha incorreta.")

        if not await self._patients.belongs_to(
            paciente_id=paciente_id, usuario_id=usuario_id, is_admin=is_admin
        ):
            raise NotFoundError("Paciente não encontrado.")

        await self._patients.delete_cascade(
            paciente_id=paciente_id,
            usuario_id=usuario_id,
            is_admin=is_admin,
        )
