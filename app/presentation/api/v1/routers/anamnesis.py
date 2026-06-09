"""HTTP router for clinical evaluation (anamnesis) endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dtos.anamnesis import (
    ChecklistItemDTO,
    HistoricoFamiliarDTO,
    SubmitAnamnesisDTO,
)
from app.application.use_cases.submit_anamnesis import (
    AnamnesisResult,
    SubmitAnamnesisUseCase,
)
from app.db.database import get_db_session
from app.domain.services.symptom_scoring_orchestrator import SymptomScoringOrchestrator
from app.interfaces.api.dependencies import AuthenticatedDoctor, get_current_doctor
from app.interfaces.repositories.audit_repository import AuditRepository
from app.interfaces.repositories.avaliacao_repository import AvaliacaoRepository
from app.interfaces.repositories.checklist_repository import ChecklistRepository
from app.interfaces.repositories.encaminhamento_repository import EncaminhamentoRepository
from app.interfaces.repositories.historico_familiar_repository import (
    HistoricoFamiliarRepository,
)
from app.presentation.api.v1.schemas.anamnesis import (
    AvaliacaoResponse,
    SubmitAnamnesisRequest,
)

router = APIRouter(prefix="/avaliacoes", tags=["Anamnese Clínica"])


def _build_use_case(session: AsyncSession) -> SubmitAnamnesisUseCase:
    """Factory that wires the use case with its concrete dependencies."""
    return SubmitAnamnesisUseCase(
        avaliacoes=AvaliacaoRepository(session),
        checklist=ChecklistRepository(session),
        historico=HistoricoFamiliarRepository(session),
        scoring=SymptomScoringOrchestrator(),
        encaminhamentos=EncaminhamentoRepository(session),
        audit=AuditRepository(session),
    )


def _to_dto(payload: SubmitAnamnesisRequest) -> SubmitAnamnesisDTO:
    """Translate the HTTP schema into the application DTO."""
    h = payload.historico_familiar
    return SubmitAnamnesisDTO(
        paciente_id=payload.paciente_id,
        sessao_id=payload.sessao_id,
        observacoes=payload.observacoes,
        diagnostico_previo_fxs=payload.diagnostico_previo_fxs,
        respostas=[
            ChecklistItemDTO(
                sintoma_id=r.sintoma_id,
                presente=r.presente,
                observacao=r.observacao,
            )
            for r in payload.respostas
        ],
        historico_familiar=HistoricoFamiliarDTO(
            deficiencia_intelectual=h.deficiencia_intelectual,
            falencia_ovariana_precoce=h.falencia_ovariana_precoce,
            autismo_na_familia=h.autismo_na_familia,
            epilepsia=h.epilepsia,
            infertilidade_masculina=h.infertilidade_masculina,
            menopausa_precoce=h.menopausa_precoce,
            abortos_recorrentes=h.abortos_recorrentes,
            tremor_ataxia_familiar=h.tremor_ataxia_familiar,
            descricao_outros=h.descricao_outros,
        ),
    )


@router.post(
    "",
    response_model=AvaliacaoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submeter anamnese clínica e calcular score FXS",
)
async def submit_anamnesis(
    payload: SubmitAnamnesisRequest,
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
    session: AsyncSession = Depends(get_db_session),
) -> AvaliacaoResponse:
    """Submit a clinical checklist and trigger score computation."""
    use_case = _build_use_case(session)
    dto = _to_dto(payload)

    try:
        result: AnamnesisResult = await use_case.execute(
            request=dto,
            usuario_id=doctor.usuario_id,
            session=session,
        )
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro no banco durante a submissão da avaliação: {exc}",
        ) from exc

    return AvaliacaoResponse(
        avaliacao_id=result.avaliacao_id,
        paciente_id=payload.paciente_id,
        score_final=result.scoring.score_final,
        limiar_usado=result.scoring.limiar_usado,
        recomenda_exame=result.scoring.recomenda_exame,
        versao_param=result.scoring.versao_param,
        status="finalizada",
    )
