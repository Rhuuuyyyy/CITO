-- ════════════════════════════════════════════════════════════════════════
-- Modelo B: acompanhante POR AVALIAÇÃO
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE tb_avaliacoes
    ADD COLUMN IF NOT EXISTS acompanhante_id INTEGER
    REFERENCES tb_acompanhantes(id);

COMMENT ON COLUMN tb_avaliacoes.acompanhante_id IS
    'Acompanhante que esteve presente NESTA avaliação (modelo B). NULL = usar o acompanhante atual do paciente como fallback.';
