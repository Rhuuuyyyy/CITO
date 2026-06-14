from __future__ import annotations

import os

from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    DomainError,
    LGPDComplianceError,
    NotFoundError,
    SXFpError,
)
from app.db.database import engine
from app.presentation.api.v1.routers import (
    acompanhantes,
    agendamentos,
    anamnesis,
    auth,
    feriados,
    history,
    patients,
    relatorios,
    symptoms,
    users,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Backend API for the Fragile X Syndrome (FXS) diagnostic and management "
            "platform. Built around a hexagonal (ports & adapters) architecture so "
            "that the database and frontend can be plugged in independently."
        ),
        openapi_url=f"{settings.api_prefix}/openapi.json",
        docs_url=f"{settings.api_prefix}/docs",
        redoc_url=f"{settings.api_prefix}/redoc",
        lifespan=lifespan,
    )

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    @app.exception_handler(NotFoundError)
    async def _not_found(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={
                "type": NotFoundError.code,
                "title": "Not Found",
                "detail": str(exc),
            },
        )

    @app.exception_handler(ConflictError)
    async def _conflict(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={
                "type": ConflictError.code,
                "title": "Conflict",
                "detail": str(exc),
            },
        )

    @app.exception_handler(AuthenticationError)
    async def _authn(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=401,
            content={
                "type": AuthenticationError.code,
                "title": "Unauthenticated",
                "detail": str(exc),
            },
        )

    @app.exception_handler(AuthorizationError)
    async def _authz(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=403,
            content={
                "type": AuthorizationError.code,
                "title": "Forbidden",
                "detail": str(exc),
            },
        )

    @app.exception_handler(LGPDComplianceError)
    async def _lgpd(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "type": LGPDComplianceError.code,
                "title": "LGPD Violation",
                "detail": str(exc),
            },
        )

    @app.exception_handler(DomainError)
    async def _domain(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "type": DomainError.code,
                "title": "Domain Error",
                "detail": str(exc),
            },
        )

    @app.exception_handler(SXFpError)
    async def _sxfp(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "type": SXFpError.code,
                "title": "Internal Error",
                "detail": "Erro interno.",
            },
        )

    app.include_router(anamnesis.router, prefix=settings.api_prefix)
    app.include_router(auth.router, prefix=settings.api_prefix)
    app.include_router(patients.router, prefix=settings.api_prefix)
    app.include_router(history.router, prefix=settings.api_prefix)
    app.include_router(symptoms.router, prefix=settings.api_prefix)
    app.include_router(agendamentos.router, prefix=settings.api_prefix)
    app.include_router(relatorios.router, prefix=settings.api_prefix)
    app.include_router(acompanhantes.router, prefix=settings.api_prefix)
    app.include_router(users.router, prefix=settings.api_prefix)
    app.include_router(feriados.router, prefix=settings.api_prefix)

    @app.get("/health", tags=["Meta"])
    async def health() -> dict:
        root_dir = Path(__file__).resolve().parent.parent
        frontend_dir = root_dir / "frontend"
        
        return {
            "status": "ok",
            "frontend_exists": frontend_dir.is_dir(),
            "frontend_path": str(frontend_dir),
            "root_contents": os.listdir(root_dir)
        }

    FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

    no_cache = {"Cache-Control": "no-cache"}

    if FRONTEND_DIR.is_dir():
        @app.get("/")
        async def serve_index():
            return FileResponse(FRONTEND_DIR / "index.html", headers=no_cache)

        @app.get("/{full_path:path}")
        async def catch_all(full_path: str):
            file_path = FRONTEND_DIR / full_path
            if file_path.is_file():
                return FileResponse(file_path, headers=no_cache)
            return FileResponse(FRONTEND_DIR / "index.html", headers=no_cache)
        
    return app

app = create_app()