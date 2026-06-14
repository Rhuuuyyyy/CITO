from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.security import JWTError, TokenClaims, verify_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


@dataclass(frozen=True)
class AuthenticatedDoctor:

    usuario_id: int
    sessao_id: int
    role: str


async def get_current_doctor(
    token: str = Depends(oauth2_scheme),
) -> AuthenticatedDoctor:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        claims: TokenClaims = verify_access_token(token)
    except (JWTError, Exception):
        raise credentials_exception from None

    if claims.role not in ("doctor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role não autorizado para este endpoint.",
        )

    return AuthenticatedDoctor(
        usuario_id=claims.usuario_id,
        sessao_id=claims.sessao_id,
        role=claims.role,
    )


async def get_current_admin(
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
) -> AuthenticatedDoctor:
    if doctor.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem acessar este recurso.",
        )
    return doctor