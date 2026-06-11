-- ════════════════════════════════════════════════════════════════════════
-- Modelo B: acompanhante POR AVALIAÇÃO
-- ════════════════════════════════════════════════════════════════════════
-- Hoje o acompanhante vive só no paciente (tb_pacientes.acompanhante_id), um
-- único e "atual". Isso impede registrar que o paciente foi com a Mãe num dia
-- e com o Pai em outro — e faz a reimpressão de laudos antigos mostrar o
-- acompanhante atual, não o que de fato acompanhou aquela triagem.
--
-- Esta coluna passa a registrar, em cada avaliação, QUEM acompanhou naquela
-- visita. Avaliações antigas ficam com NULL e o app cai de volta no
-- acompanhante atual do paciente (COALESCE no SELECT do backend).
--
-- Aplicar no Supabase (SQL Editor) uma única vez.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE tb_avaliacoes
    ADD COLUMN IF NOT EXISTS acompanhante_id INTEGER
    REFERENCES tb_acompanhantes(id);

COMMENT ON COLUMN tb_avaliacoes.acompanhante_id IS
    'Acompanhante que esteve presente NESTA avaliação (modelo B). NULL = usar o acompanhante atual do paciente como fallback.';
