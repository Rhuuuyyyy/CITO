from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dtos.anamnesis import SubmitAnamnesisDTO
from app.domain.services.symptom_scoring_orchestrator import (
    ScoringResult,
    SymptomScoringOrchestrator,
)
from app.interfaces.repositories.audit_repository import AuditRepository
from app.interfaces.repositories.avaliacao_repository import AvaliacaoRepository
from app.interfaces.repositories.checklist_repository import ChecklistRepository
from app.interfaces.repositories.encaminhamento_repository import EncaminhamentoRepository
from app.interfaces.repositories.historico_familiar_repository import (
    HistoricoFamiliarRepository,
)


@dataclass(frozen=True)
class AnamnesisResult:
    avaliacao_id: int
    scoring: ScoringResult


class SubmitAnamnesisUseCase:

    def __init__(
        self,
        avaliacoes: AvaliacaoRepository,
        checklist: ChecklistRepository,
        historico: HistoricoFamiliarRepository,
        scoring: SymptomScoringOrchestrator,
        encaminhamentos: EncaminhamentoRepository,
        audit: AuditRepository,
    ) -> None:
        self._avaliacoes = avaliacoes
        self._checklist = checklist
        self._historico = historico
        self._scoring = scoring
        self._encaminhamentos = encaminhamentos
        self._audit = audit

    async def execute(
        self,
        *,
        request: SubmitAnamnesisDTO,
        usuario_id: int,
        session: AsyncSession,
    ) -> AnamnesisResult:
        avaliacao_id = await self._avaliacoes.create_rascunho(
            paciente_id=request.paciente_id,
            usuario_id=usuario_id,
            observacoes=request.observacoes,
            diagnostico_previo_fxs=request.diagnostico_previo_fxs,
        )

        await self._avaliacoes.set_acompanhante(
            avaliacao_id=avaliacao_id,
            acompanhante_id=request.acompanhante_id,
            grau_parentesco=request.grau_parentesco,
        )

        await self._avaliacoes.open_log_analise(
            avaliacao_id=avaliacao_id,
            usuario_id=usuario_id,
            sessao_id=request.sessao_id,
        )

        await self._checklist.insert_respostas(
            avaliacao_id=avaliacao_id,
            respostas=request.respostas,
        )

        await self._historico.add(
            avaliacao_id=avaliacao_id,
            historico=request.historico_familiar,
        )

        scoring_result = await self._scoring.execute_scoring(
            avaliacao_id=avaliacao_id,
            session=session,
        )

        if scoring_result.recomenda_exame:
            await self._encaminhamentos.add(
                avaliacao_id=avaliacao_id,
                tipo="exame_fmr1",
                justificativa=(
                    "Score de triagem igual ou acima do limiar para o sexo do paciente."
                ),
                gerado_automaticamente=True,
            )

        await self._audit.registrar(
            usuario_id=usuario_id,
            sessao_id=request.sessao_id,
            acao="AVALIACAO_FINALIZADA",
            tabela="tb_avaliacoes",
            registro_id=str(avaliacao_id),
        )

        return AnamnesisResult(avaliacao_id=avaliacao_id, scoring=scoring_result)
