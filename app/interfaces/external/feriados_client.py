"""External adapter for the BrasilAPI national holidays service.

Relies only on the Python standard library (urllib) so the runtime keeps no
extra dependency. The blocking network call is pushed to a worker thread, and
each successful yearly response is cached in-process because the holiday list
for a given year does not change.
"""
from __future__ import annotations

import asyncio
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

_BASE_URL = "https://brasilapi.com.br/api/feriados/v1"
_TIMEOUT_SECONDS = 6
_cache: dict[int, list[dict[str, str]]] = {}


class FeriadosClient:
    """Fetches the Brazilian national holidays for a given year."""

    async def list_by_year(self, ano: int) -> list[dict[str, str]]:
        if ano in _cache:
            return _cache[ano]
        feriados = await asyncio.to_thread(self._fetch, ano)
        _cache[ano] = feriados
        return feriados

    def _fetch(self, ano: int) -> list[dict[str, str]]:
        url = f"{_BASE_URL}/{ano}"
        request = Request(url, headers={"User-Agent": "CITO/1.0"})
        try:
            with urlopen(request, timeout=_TIMEOUT_SECONDS) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, ValueError):
            return []
        return [
            {
                "data": item["date"],
                "nome": item["name"],
                "tipo": item.get("type", ""),
            }
            for item in payload
            if isinstance(item, dict) and "date" in item and "name" in item
        ]
