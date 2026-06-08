"""Delegates score computation to the database function fn_calcular_score_triagem."""
from dataclasses import dataclass
from typing import cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class ScoringResult:
    score_final: float
    limiar_usado: float
    recomenda_exame: bool
    versao_param: str


class SymptomScoringOrchestrator:
    async def execute_scoring(
        self, avaliacao_id: int, session: AsyncSession
    ) -> ScoringResult:
        result = await session.execute(
            text("SELECT * FROM fn_calcular_score_triagem(:avaliacao_id)"),
            {"avaliacao_id": avaliacao_id},
        )
        row = result.mappings().first()
        if row is None:
            raise ValueError(
                f"Falha ao calcular score para avaliação {avaliacao_id}"
            )

        return ScoringResult(
            score_final=cast(float, row["score_final"]),
            limiar_usado=cast(float, row["limiar_usado"]),
            recomenda_exame=cast(bool, row["recomenda_exame"]),
            versao_param=cast(str, row["versao_param"]),
        )