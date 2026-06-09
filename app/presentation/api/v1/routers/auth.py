"""HTTP router for authentication endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import issue_access_token
from app.db.database import get_db_session
from app.presentation.api.v1.schemas.auth import TokenLoginResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post(
    "/login",
    response_model=TokenLoginResponse,
    summary="Autenticar médico e abrir sessão",
)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_db_session),
) -> TokenLoginResponse:
    """Authenticate a doctor and open a session."""
    auth_service = AuthService(session)
    ip_origem = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    if await auth_service.check_brute_force(ip_origem=ip_origem):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas de login. Tente novamente em 10 minutos.",
        )

    usuario_id = await auth_service.authenticate_doctor(
        email=form_data.username,
        senha_plain=form_data.password,
    )

    sucesso = usuario_id is not None
    sessao_id: int | None = None

    if sucesso and usuario_id is not None:
        sessao_id = await auth_service.open_session(
            usuario_id=usuario_id,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )

    await auth_service.log_tentativa_login(
        email_tentado=form_data.username,
        ip_origem=ip_origem,
        user_agent=user_agent,
        sucesso=sucesso,
        usuario_id=usuario_id,
        sessao_id=sessao_id,
        motivo_falha=None if sucesso else "credenciais_invalidas",
    )

    if not sucesso or sessao_id is None or usuario_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = issue_access_token(
        usuario_id=usuario_id,
        role="doctor",
        sessao_id=sessao_id,
    )

    return TokenLoginResponse(
        access_token=access_token,
        token_type="Bearer",
        sessao_id=sessao_id,
        usuario_id=usuario_id,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Encerrar sessão ativa",
)
async def logout(
    sessao_id: int,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Close an active session in tb_log_sessoes."""
    auth_service = AuthService(session)
    await auth_service.close_session(
        sessao_id=sessao_id,
        tipo_encerramento="logout",
    )