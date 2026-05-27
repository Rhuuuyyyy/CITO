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

secret_key: str = Field(default="change-me-in-environment", min_lenght=8)

cors_origins: list[str] = Field(default_factory=list)