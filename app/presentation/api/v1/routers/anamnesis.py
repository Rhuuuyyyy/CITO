"""HTTP router for clinical evaluation (anamnesis) endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dtos.anamnesis import (
    ChecklistItemDTO,
    HistoricoFamiliarDTO,
    SubmitAnamnesisDTO,
)
from app.application.use_cases.get_evaluation_detail import GetEvaluationDetailUseCase
from app.application.use_cases.submit_anamnesis import (
    AnamnesisResult,
    SubmitAnamnesisUseCase,
)
from app.db.database import get_db_session
from app.domain.services.symptom_scoring_orchestrator import SymptomScoringOrchestrator
from app.interfaces.api.dependencies import AuthenticatedDoctor, get_current_doctor
from app.interfaces.repositories.audit_repository import AuditRepository
from app.interfaces.repositories.avaliacao_read_repository import AvaliacaoReadRepository
from app.interfaces.repositories.avaliacao_repository import AvaliacaoRepository
from app.interfaces.repositories.checklist_repository import ChecklistRepository
from app.interfaces.repositories.encaminhamento_repository import EncaminhamentoRepository
from app.interfaces.repositories.historico_familiar_repository import (
    HistoricoFamiliarRepository,
)
from app.presentation.api.v1.schemas.anamnesis import (
    AvaliacaoDetalheResponse,
    AvaliacaoResponse,
    HistoricoFamiliarSchema,
    SintomaRespostaDetalheSchema,
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
        acompanhante_id=payload.acompanhante_id,
        grau_parentesco=payload.grau_parentesco,
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


@router.get(
    "/{avaliacao_id}",
    response_model=AvaliacaoDetalheResponse,
    summary="Detalhe completo de uma avaliação (para reimpressão do laudo)",
)
async def get_evaluation_detail(
    avaliacao_id: int,
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
    session: AsyncSession = Depends(get_db_session),
) -> AvaliacaoDetalheResponse:
    use_case = GetEvaluationDetailUseCase(
        avaliacoes=AvaliacaoReadRepository(session)
    )
    detail = await use_case.execute(
        avaliacao_id=avaliacao_id,
        usuario_id=doctor.usuario_id,
        is_admin=(doctor.role == "admin"),
    )
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avaliação não encontrada.",
        )

    historico = None
    if detail.historico is not None:
        h = detail.historico
        historico = HistoricoFamiliarSchema(
            deficiencia_intelectual=h.deficiencia_intelectual,
            falencia_ovariana_precoce=h.falencia_ovariana_precoce,
            autismo_na_familia=h.autismo_na_familia,
            epilepsia=h.epilepsia,
            infertilidade_masculina=h.infertilidade_masculina,
            menopausa_precoce=h.menopausa_precoce,
            abortos_recorrentes=h.abortos_recorrentes,
            tremor_ataxia_familiar=h.tremor_ataxia_familiar,
            descricao_outros=h.descricao_outros,
        )

    return AvaliacaoDetalheResponse(
        avaliacao_id=detail.avaliacao_id,
        data_avaliacao=detail.data_avaliacao,
        score_final=detail.score_final,
        recomenda_exame=detail.recomenda_exame,
        paciente_nome=detail.paciente_nome,
        paciente_sexo=detail.paciente_sexo,
        paciente_data_nascimento=detail.paciente_data_nascimento,
        acompanhante_nome=detail.acompanhante_nome,
        acompanhante_relacao=detail.acompanhante_relacao,
        acompanhante_telefone=detail.acompanhante_telefone,
        acompanhante_email=detail.acompanhante_email,
        sintomas=[
            SintomaRespostaDetalheSchema(descricao=s.descricao, presente=s.presente)
            for s in detail.sintomas
        ],
        historico_familiar=historico,
    )
