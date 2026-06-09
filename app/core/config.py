"""Typed application settings loaded from environment variables.

Centralising configuration here keeps every other layer free of `os.environ`
look-ups and gives FastAPI a single dependency-injectable source of truth.
"""
import json
from functools import lru_cache
from typing import Annotated

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "CITO Backend"
    app_version: str = "0.1.0"
    environment: str = Field(default="development")
    debug: bool = False

    api_prefix: str = "/api/v1"

    secret_key: str = Field(default="change-me-in-environment", min_length=8)

    # NoDecode: don't let pydantic-settings JSON-parse the env var before we do.
    # Accepts both JSON (["http://a","http://b"]) and CSV (http://a,http://b).
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, v: object) -> object:
        if v is None or v == "":
            return []
        if isinstance(v, str):
            s = v.strip()
            if s.startswith("["):
                return json.loads(s)
            return [origin.strip() for origin in s.split(",") if origin.strip()]
        return v

    database_url: SecretStr = Field(
        default=SecretStr("postgresql+asyncpg://localhost/cito")
    )
    pgp_key: SecretStr = Field(default=SecretStr("change-me-pgp-key"))

@lru_cache
def get_settings() -> Settings:
    """Return a cached 'Settings' instance. Use as FastAPI dependendy."""
    return Settings()
