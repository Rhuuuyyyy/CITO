from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dtos.anamnesis import HistoricoFamiliarDTO


class HistoricoFamiliarRepository:

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(
        self,
        *,
        avaliacao_id: int,
        historico: HistoricoFamiliarDTO,
    ) -> None:
        await self._session.execute(
            text(
                """
                INSERT INTO tb_historico_familiar (
                    avaliacao_id,
                    deficiencia_intelectual, falencia_ovariana_precoce,
                    autismo_na_familia, epilepsia, infertilidade_masculina,
                    menopausa_precoce, abortos_recorrentes, tremor_ataxia_familiar,
                    descricao_outros
                ) VALUES (
                    :avaliacao_id,
                    :deficiencia_intelectual, :falencia_ovariana_precoce,
                    :autismo_na_familia, :epilepsia, :infertilidade_masculina,
                    :menopausa_precoce, :abortos_recorrentes, :tremor_ataxia_familiar,
                    :descricao_outros
                )
                """
            ),
            {
                "avaliacao_id": avaliacao_id,
                "deficiencia_intelectual": historico.deficiencia_intelectual,
                "falencia_ovariana_precoce": historico.falencia_ovariana_precoce,
                "autismo_na_familia": historico.autismo_na_familia,
                "epilepsia": historico.epilepsia,
                "infertilidade_masculina": historico.infertilidade_masculina,
                "menopausa_precoce": historico.menopausa_precoce,
                "abortos_recorrentes": historico.abortos_recorrentes,
                "tremor_ataxia_familiar": historico.tremor_ataxia_familiar,
                "descricao_outros": historico.descricao_outros,
            },
        )
