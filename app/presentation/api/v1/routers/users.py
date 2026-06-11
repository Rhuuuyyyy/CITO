"""HTTP router for admin user management. All endpoints are admin-only."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.manage_users import (
    CreateMedicoUseCase,
    DeleteUserUseCase,
    ListUsersUseCase,
    SetUserAtivoUseCase,
)
from app.db.database import get_db_session
from app.interfaces.api.dependencies import AuthenticatedDoctor, get_current_admin
from app.interfaces.repositories.user_repository import UserListItem, UserRepository
from app.presentation.api.v1.schemas.user import (
    UserCreateRequest,
    UserDeleteRequest,
    UserResponse,
    UserSetAtivoRequest,
)

router = APIRouter(prefix="/usuarios", tags=["Usuários (admin)"])


def _to_response(u: UserListItem) -> UserResponse:
    return UserResponse(
        id=u.id,
        nome=u.nome,
        email=u.email,
        crm=u.crm,
        especialidade=u.especialidade,
        tipo=u.tipo,
        ativo=u.ativo,
        ultimo_acesso=u.ultimo_acesso,
    )


@router.get("", response_model=list[UserResponse], summary="Listar usuários")
async def list_users(
    admin: AuthenticatedDoctor = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[UserResponse]:
    use_case = ListUsersUseCase(users=UserRepository(session))
    return [_to_response(u) for u in await use_case.execute()]


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo médico",
)
async def create_user(
    payload: UserCreateRequest,
    admin: AuthenticatedDoctor = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> UserResponse:
    use_case = CreateMedicoUseCase(users=UserRepository(session))
    created = await use_case.execute(
        nome=payload.nome,
        email=payload.email,
        crm=payload.crm,
        especialidade=payload.especialidade,
        senha=payload.senha,
    )
    return _to_response(created)


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="Ativar/desativar usuário",
)
async def set_user_ativo(
    user_id: int,
    payload: UserSetAtivoRequest,
    admin: AuthenticatedDoctor = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> UserResponse:
    use_case = SetUserAtivoUseCase(users=UserRepository(session))
    updated = await use_case.execute(
        user_id=user_id,
        ativo=payload.ativo,
        requesting_admin_id=admin.usuario_id,
    )
    return _to_response(updated)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir usuário (confirma com senha do admin)",
)
async def delete_user(
    user_id: int,
    payload: UserDeleteRequest,
    admin: AuthenticatedDoctor = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    use_case = DeleteUserUseCase(users=UserRepository(session))
    await use_case.execute(
        user_id=user_id,
        requesting_admin_id=admin.usuario_id,
        senha_admin=payload.senha_admin,
    )
