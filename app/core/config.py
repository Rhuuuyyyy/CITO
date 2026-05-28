"""Typed application settings loaded from environment variables.

Centralising configuration here keeps every other layer free of `os.environ`
look-ups and gives FastAPI a single dependency-injectable source of truth.
"""
from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file:".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

app_name: str = "CITO Backend"
app_verison: str = "0.1.0"
environment: str = Field(default="development")
debug: bool = False

api_prefix: str = "/api/v1"

secret_key: str = Field(default="change-me-in-environment", min_length=8)

cors_origins: list[str] = Field(default_factory=list)

database_url: SecretStr = Field(
    default=SecretStr("postgresql+asyncpg://localhost/cito")
    # NÃO DEVE SER COLOCADO O LINK DO BANCO AQUI.
)
pgp_key: SecretStr = Field(default=SecretStr("change-me-pgp-key"))

@lru_cache
def get_settings() -> Settings:
    """Return a cached 'Settings' instance. Use as FastAPI dependendy."""
    return Settings()
