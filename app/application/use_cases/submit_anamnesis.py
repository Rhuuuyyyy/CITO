"""SubmitAnamnesisUseCase — orchestrates the clinical write path.

Flow:
  1. Create evaluation record (status='rascunho')
  2. Open tb_log_analises entry
  3. Insert checklist answers into respostas_checklist
  4. Delegate score computation to fn_calcular_score_triagem (via orchestrator)
  5. Return ScoringResult to the router
"""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dtos.anamnesis import SubmitAnamnesisDTO
from app.domain.services.symptom_scoring_orchestrator import (
    ScoringResult,
    SymptomScoringOrchestrator,
)
from app.interfaces.repositories.avaliacao_repository import AvaliacaoRepository
from app.interfaces.repositories.checklist_repository import ChecklistRepository


@dataclass(frozen=True)
class AnamnesisResult:
    avaliacao_id: int
    scoring: ScoringResult


class SubmitAnamnesisUseCase:
    """Orchestrates one complete clinical evaluation submission.

    Dependencies are injected via constructor — no service-locator anti-pattern.
    This class is HTTP-blind: it raises domain exceptions, never HTTPException.
    """

    def __init__(
        self,
        avaliacoes: AvaliacaoRepository,
        checklist: ChecklistRepository,
        scoring: SymptomScoringOrchestrator,
    ) -> None:
        self._avaliacoes = avaliacoes
        self._checklist = checklist
        self._scoring = scoring

    async def execute(
        self,
        *,
        request: SubmitAnamnesisDTO,
        usuario_id: int,
        session: AsyncSession,
    ) -> AnamnesisResult:
        """Execute the full anamnesis submission and score calculation.

        Args:
            request: Application DTO translated from the HTTP router payload.
            usuario_id: DB integer id of the authenticated doctor.
            session: Request-scoped AsyncSession (unit of work owner).

        Returns:
            AnamnesisResult with avaliacao_id and the ScoringResult from the DB function.

        Raises:
            RuntimeError: If the DB function fails to return a result.
        """
        # Step 1 — Create evaluation record in 'rascunho' state
        avaliacao_id = await self._avaliacoes.create_rascunho(
            paciente_id=request.paciente_id,
            usuario_id=usuario_id,
            observacoes=request.observacoes,
            diagnostico_previo_fxs=request.diagnostico_previo_fxs,
        )

        # Step 2 — Record when the doctor opened the checklist form
        await self._avaliacoes.open_log_analise(
            avaliacao_id=avaliacao_id,
            usuario_id=usuario_id,
            sessao_id=request.sessao_id,
        )

        # Step 3 — Persist per-symptom answers
        await self._checklist.insert_respostas(
            avaliacao_id=avaliacao_id,
            respostas=request.respostas,
        )

        # Step 4 — Delegate scoring to fn_calcular_score_triagem (Active DB)
        # The DB function: calculates score, updates tb_avaliacoes, closes
        # tb_log_analises, and inserts into tb_auditoria — all in one atomic call.
        scoring_result = await self._scoring.execute_scoring(
            avaliacao_id=avaliacao_id,
            session=session,
        )

        return AnamnesisResult(avaliacao_id=avaliacao_id, scoring=scoring_result)