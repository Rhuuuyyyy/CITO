from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dtos.anamnesis import ChecklistItemDTO


class ChecklistRepository:

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def insert_respostas(
        self,
        *,
        avaliacao_id: int,
        respostas: list[ChecklistItemDTO],
    ) -> None:
        for resposta in respostas:
            await self._session.execute(
                text(
                    """
                    INSERT INTO respostas_checklist (avaliacao_id, sintoma_id,
                                                     presente, observacao)
                    VALUES (:avaliacao_id, :sintoma_id, :presente, :observacao)
                    """
                ),
                {
                    "avaliacao_id": avaliacao_id,
                    "sintoma_id": resposta.sintoma_id,
                    "presente": resposta.presente,
                    "observacao": resposta.observacao,
                },
            )