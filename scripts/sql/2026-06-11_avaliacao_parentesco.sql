-- ════════════════════════════════════════════════════════════════════════
-- Modelo B (parte 2): relação do acompanhante POR AVALIAÇÃO
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE tb_avaliacoes
    ADD COLUMN IF NOT EXISTS grau_parentesco VARCHAR(40);

COMMENT ON COLUMN tb_avaliacoes.grau_parentesco IS
    'Relação do acompanhante com o paciente NESTA avaliação (modelo B). NULL = usar o grau_parentesco atual do paciente como fallback.';
