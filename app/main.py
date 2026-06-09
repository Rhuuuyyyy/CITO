"""FastAPI application factory and ASGI entry point.

This is the composition root of the hexagonal architecture.
It is the ONLY file allowed to import from every other layer.
"""
from __future__ import annotations

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
    agendamentos,
    anamnesis,
    auth,
    history,
    patients,
    relatorios,
    symptoms,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Open long-lived resources on startup, close them on shutdown."""
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

    # ── Middlewares ────────────────────────────────────────────────────────────
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # ── Exception handlers (RFC 7807 Problem Details) ─────────────────────────
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

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(anamnesis.router, prefix=settings.api_prefix)
    app.include_router(auth.router, prefix=settings.api_prefix)
    app.include_router(patients.router, prefix=settings.api_prefix)
    app.include_router(history.router, prefix=settings.api_prefix)
    app.include_router(symptoms.router, prefix=settings.api_prefix)
    app.include_router(agendamentos.router, prefix=settings.api_prefix)
    app.include_router(relatorios.router, prefix=settings.api_prefix)

    # ── Health probe (outside api_prefix for infra / k8s) ────────────────────
    @app.get("/health", tags=["Meta"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": settings.app_name}

    return app


app = create_app()