from __future__ import annotations

from sqlalchemy.exc import IntegrityError

from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.interfaces.repositories.user_repository import UserListItem, UserRepository


class CreateMedicoUseCase:

    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(
        self,
        *,
        nome: str,
        email: str,
        crm: str | None,
        especialidade: str | None,
        senha: str,
    ) -> UserListItem:
        nome = (nome or "").strip()
        email = (email or "").strip().lower()
        if not nome:
            raise DomainError("Nome é obrigatório.")
        if not email:
            raise DomainError("E-mail é obrigatório.")
        if len(senha or "") < 8:
            raise DomainError("A senha deve ter pelo menos 8 caracteres.")
        if await self._users.email_exists(email):
            raise ConflictError("Já existe um usuário com este e-mail.")

        new_id = await self._users.create_medico(
            nome=nome,
            email=email,
            crm=(crm or "").strip() or None,
            especialidade=(especialidade or "").strip() or None,
            senha_plain=senha,
        )
        created = await self._users.get_by_id(new_id)
        if created is None:
            raise NotFoundError("Usuário criado não pôde ser lido.")
        return created


class ListUsersUseCase:
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(self) -> list[UserListItem]:
        return await self._users.list_all()


class SetUserAtivoUseCase:

    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(
        self,
        *,
        user_id: int,
        ativo: bool,
        requesting_admin_id: int,
    ) -> UserListItem:
        if not ativo and user_id == requesting_admin_id:
            raise DomainError("Você não pode desativar a própria conta.")

        alvo = await self._users.get_by_id(user_id)
        if alvo is None:
            raise NotFoundError("Usuário não encontrado.")

        await self._users.set_ativo(user_id=user_id, ativo=ativo)
        atualizado = await self._users.get_by_id(user_id)
        if atualizado is None:
            raise NotFoundError("Usuário não encontrado após atualização.")
        return atualizado


class DeleteUserUseCase:

    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(
        self,
        *,
        user_id: int,
        requesting_admin_id: int,
        senha_admin: str,
    ) -> None:
        if user_id == requesting_admin_id:
            raise DomainError("Você não pode excluir a própria conta.")

        if not await self._users.verify_password(
            user_id=requesting_admin_id, senha_plain=senha_admin
        ):
            raise DomainError("Senha do administrador incorreta.")

        alvo = await self._users.get_by_id(user_id)
        if alvo is None:
            raise NotFoundError("Usuário não encontrado.")

        try:
            await self._users.delete(user_id=user_id)
        except IntegrityError as exc:
            raise ConflictError(
                "Não é possível excluir: este usuário possui registros vinculados "
                "(pacientes, avaliações ou histórico de acesso). Desative-o em vez "
                "de excluir, para preservar a trilha clínica e de auditoria."
            ) from exc
