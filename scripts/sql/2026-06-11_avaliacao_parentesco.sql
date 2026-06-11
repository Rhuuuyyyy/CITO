-- ════════════════════════════════════════════════════════════════════════
-- Modelo B (parte 2): relação do acompanhante POR AVALIAÇÃO
-- ════════════════════════════════════════════════════════════════════════
-- Complementa 2026-06-11_avaliacao_acompanhante.sql. Como o acompanhante é
-- registrado por visita, a relação dele com o paciente (Mãe, Pai, …) também
-- é por visita. Esta coluna guarda esse grau_parentesco na própria avaliação;
-- avaliações antigas ficam NULL e o app cai no grau_parentesco do paciente.
--
-- Aplicar no Supabase (SQL Editor) uma única vez.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE tb_avaliacoes
    ADD COLUMN IF NOT EXISTS grau_parentesco VARCHAR(40);

COMMENT ON COLUMN tb_avaliacoes.grau_parentesco IS
    'Relação do acompanhante com o paciente NESTA avaliação (modelo B). NULL = usar o grau_parentesco atual do paciente como fallback.';
