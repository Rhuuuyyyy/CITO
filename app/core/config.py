"""Typed application settings loaded from environment variables.

Centralising configuration here keeps every other layer free of `os.environ`
look-ups and gives FastAPI a single dependency-injectable source of truth.
"""
from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict