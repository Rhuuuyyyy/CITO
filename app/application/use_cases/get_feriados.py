from __future__ import annotations

from app.interfaces.external.feriados_client import FeriadosClient


class GetFeriadosUseCase:

    def __init__(self, client: FeriadosClient) -> None:
        self._client = client

    async def execute(self, ano: int) -> list[dict[str, str]]:
        return await self._client.list_by_year(ano)
