-- =============================================================================
-- Sistema SXF — Síndrome do X Frágil (Apoio ao Diagnóstico)
-- Parte 2 de 3 — Funções, triggers e views (camada de abstração)
-- Depende das tabelas criadas na Parte 1.
--
-- A chave PGP NUNCA fica no banco: o back-end injeta por sessão com
--   SELECT set_config('app.pgp_key', '<chave>', true);
-- e as funções/views a leem via current_setting('app.pgp_key', true).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Limpeza de objetos da Parte 2 (idempotência)
-- -----------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS vw_dashboard_anonimizado CASCADE;
DROP VIEW IF EXISTS avaliacoes    CASCADE;
DROP VIEW IF EXISTS pacientes     CASCADE;
DROP VIEW IF EXISTS acompanhantes CASCADE;

-- =============================================================================
-- 7.4 fn_set_updated_at() — mantém atualizado_em em dia (BEFORE UPDATE)
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7.3 fn_hash_senha_usuario() — converte senha em bcrypt se ainda não for hash
--     Garante que texto plano NUNCA chegue ao disco.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_hash_senha_usuario()
RETURNS TRIGGER AS $$
BEGIN
    -- Hash bcrypt começa com $2a$, $2b$ ou $2y$. Se já vier assim, não re-hashea.
    IF NEW.senha IS NOT NULL AND NEW.senha !~ '^\$2[aby]\$' THEN
        NEW.senha := crypt(NEW.senha, gen_salt('bf', 12));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7.2 fn_registrar_auditoria(...) — insere uma linha em tb_auditoria
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_registrar_auditoria(
    p_usuario_id  INTEGER,
    p_sessao_id   BIGINT,
    p_acao        VARCHAR,
    p_tabela      VARCHAR,
    p_registro_id VARCHAR,
    p_antes       JSONB DEFAULT NULL,
    p_depois      JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO tb_auditoria (
        usuario_id, sessao_id, acao, tabela_afetada,
        registro_id, dados_anteriores, dados_novos
    )
    VALUES (
        p_usuario_id, p_sessao_id, p_acao, p_tabela,
        p_registro_id, p_antes, p_depois
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7.1 fn_calcular_score_triagem(avaliacao_id) — FUNÇÃO PRINCIPAL
--     Implementa S = Σ(Pj × Xij), com pesos por sexo (Romero et al. 2025).
--     Efeitos colaterais:
--       1) grava score_criptografado e status='finalizada' em tb_avaliacoes
--       2) fecha o registro aberto em tb_log_analises
--       3) registra SCORE_CALCULADO em tb_auditoria
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_calcular_score_triagem(p_avaliacao_id INTEGER)
RETURNS TABLE(
    score_final    NUMERIC,
    limiar_usado   NUMERIC,
    recomenda_exame BOOLEAN,
    versao_param   VARCHAR
) AS $$
DECLARE
    v_chave       TEXT;
    v_sexo        CHAR(1);
    v_diag_previo BOOLEAN;
    v_usuario_id  INTEGER;
    v_score       NUMERIC(5,4);
    v_limiar      NUMERIC(4,2);
    v_versao      VARCHAR(30);
    v_recomenda   BOOLEAN;
BEGIN
    -- Pré-requisito: chave PGP injetada na sessão
    v_chave := current_setting('app.pgp_key', true);
    IF v_chave IS NULL OR v_chave = '' THEN
        RAISE EXCEPTION 'Chave PGP ausente. Execute set_config(''app.pgp_key'', <chave>, true) antes.';
    END IF;

    -- Dados da avaliação + sexo do paciente (define quais pesos aplicar)
    SELECT p.sexo, a.diagnostico_previo_fxs, a.usuario_id
      INTO v_sexo, v_diag_previo, v_usuario_id
      FROM tb_avaliacoes a
      JOIN tb_pacientes  p ON p.id = a.paciente_id
     WHERE a.id = p_avaliacao_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Avaliação % não encontrada.', p_avaliacao_id;
    END IF;

    -- Parâmetros ativos para o sexo do paciente
    SELECT pt.limiar_score, pt.versao
      INTO v_limiar, v_versao
      FROM parametro_triagem pt
     WHERE pt.sexo = v_sexo
       AND pt.ativo = TRUE
     LIMIT 1;

    IF v_limiar IS NULL THEN
        RAISE EXCEPTION 'Nenhum parametro_triagem ativo para o sexo %.', v_sexo;
    END IF;

    -- S = Σ(Pj × Xij) — soma os pesos dos sintomas presentes, conforme o sexo
    SELECT COALESCE(SUM(
               CASE WHEN v_sexo = 'M' THEN s.peso
                    ELSE COALESCE(s.peso_feminino, 0)
               END
           ), 0)
      INTO v_score
      FROM respostas_checklist rc
      JOIN sintomas s ON s.id = rc.sintoma_id
     WHERE rc.avaliacao_id = p_avaliacao_id
       AND rc.presente = TRUE
       AND s.ativo = TRUE;

    -- Recomendação: score >= limiar E sem diagnóstico molecular prévio
    v_recomenda := (v_score >= v_limiar) AND NOT COALESCE(v_diag_previo, FALSE);

    -- 1) Persistir score cifrado + finalizar a avaliação
    UPDATE tb_avaliacoes
       SET score_criptografado = pgp_sym_encrypt(v_score::text, v_chave),
           status              = 'finalizada'
     WHERE id = p_avaliacao_id;

    -- 2) Fechar o log de análise aberto desta avaliação
    UPDATE tb_log_analises
       SET finalizada_em    = NOW(),
           status_final     = 'concluida',
           score_gerado     = v_score,
           recomendou_exame = v_recomenda
     WHERE avaliacao_id = p_avaliacao_id
       AND finalizada_em IS NULL;

    -- 3) Auditoria
    PERFORM fn_registrar_auditoria(
        v_usuario_id, NULL, 'SCORE_CALCULADO', 'tb_avaliacoes',
        p_avaliacao_id::varchar, NULL,
        jsonb_build_object(
            'score', v_score,
            'limiar', v_limiar,
            'recomenda_exame', v_recomenda,
            'versao', v_versao
        )
    );

    RETURN QUERY SELECT v_score, v_limiar, v_recomenda, v_versao;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. VIEWS — Camada de abstração (descriptografam na leitura)
-- =============================================================================

-- 5.1 view: acompanhantes
CREATE VIEW acompanhantes AS
SELECT
    a.id,
    pgp_sym_decrypt(a.nome_criptografado, current_setting('app.pgp_key', true)) AS nome,
    a.cpf_hash,
    a.telefone,
    a.email,
    a.criado_em,
    a.atualizado_em
FROM tb_acompanhantes a;

-- 5.2 view: pacientes (descriptografa nome do paciente e do acompanhante; calcula idade)
CREATE VIEW pacientes AS
SELECT
    p.id,
    pgp_sym_decrypt(p.nome_criptografado, current_setting('app.pgp_key', true)) AS nome,
    p.cpf_hash,
    p.data_nascimento,
    DATE_PART('year', AGE(p.data_nascimento))::INT AS idade_anos,
    p.sexo,
    p.etnia,
    p.uf_nascimento,
    p.municipio_residencia,
    p.uf_residencia,
    p.prematuro,
    p.idade_gestacional_semanas,
    p.peso_nascimento_gramas,
    p.escolaridade,
    p.tem_diagnostico_autismo,
    p.tem_diagnostico_tdah,
    p.outras_comorbidades,
    p.medicamentos_uso,
    p.acompanhante_id,
    pgp_sym_decrypt(ac.nome_criptografado, current_setting('app.pgp_key', true)) AS acompanhante_nome,
    ac.telefone AS acompanhante_telefone,
    ac.email    AS acompanhante_email,
    p.grau_parentesco,
    p.diagnostico_confirmado_fxs,
    p.ativo,
    p.criado_por,
    p.criado_em,
    p.atualizado_em
FROM tb_pacientes p
LEFT JOIN tb_acompanhantes ac ON ac.id = p.acompanhante_id;

-- 5.3 view: avaliacoes (descriptografa o score → DECIMAL(5,4))
CREATE VIEW avaliacoes AS
SELECT
    a.id,
    a.paciente_id,
    a.usuario_id,
    a.data_avaliacao,
    a.diagnostico_previo_fxs,
    pgp_sym_decrypt(a.score_criptografado, current_setting('app.pgp_key', true))::DECIMAL(5,4) AS score_final,
    a.observacoes,
    a.status,
    a.criado_em,
    a.atualizado_em
FROM tb_avaliacoes a;

-- =============================================================================
-- 7.5 / 7.6 / 7.7 — Funções INSTEAD OF das views (criptografam na escrita)
-- =============================================================================

-- 7.6 fn_acompanhantes_dml()
CREATE OR REPLACE FUNCTION fn_acompanhantes_dml()
RETURNS TRIGGER AS $$
DECLARE
    v_chave TEXT := current_setting('app.pgp_key', true);
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO tb_acompanhantes (nome_criptografado, cpf_hash, telefone, email)
        VALUES (pgp_sym_encrypt(NEW.nome, v_chave), NEW.cpf_hash, NEW.telefone, NEW.email)
        RETURNING id INTO NEW.id;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE tb_acompanhantes
           SET nome_criptografado = COALESCE(pgp_sym_encrypt(NEW.nome, v_chave), nome_criptografado),
               cpf_hash           = NEW.cpf_hash,
               telefone           = NEW.telefone,
               email              = NEW.email
         WHERE id = OLD.id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7.5 fn_pacientes_dml()
CREATE OR REPLACE FUNCTION fn_pacientes_dml()
RETURNS TRIGGER AS $$
DECLARE
    v_chave TEXT := current_setting('app.pgp_key', true);
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO tb_pacientes (
            nome_criptografado, cpf_hash, data_nascimento, sexo, etnia,
            uf_nascimento, municipio_residencia, uf_residencia,
            prematuro, idade_gestacional_semanas, peso_nascimento_gramas, escolaridade,
            tem_diagnostico_autismo, tem_diagnostico_tdah, outras_comorbidades, medicamentos_uso,
            acompanhante_id, grau_parentesco, diagnostico_confirmado_fxs, ativo, criado_por
        ) VALUES (
            pgp_sym_encrypt(NEW.nome, v_chave), NEW.cpf_hash, NEW.data_nascimento, NEW.sexo, NEW.etnia,
            NEW.uf_nascimento, NEW.municipio_residencia, NEW.uf_residencia,
            NEW.prematuro, NEW.idade_gestacional_semanas, NEW.peso_nascimento_gramas, NEW.escolaridade,
            COALESCE(NEW.tem_diagnostico_autismo, FALSE), COALESCE(NEW.tem_diagnostico_tdah, FALSE),
            NEW.outras_comorbidades, NEW.medicamentos_uso,
            NEW.acompanhante_id, NEW.grau_parentesco,
            COALESCE(NEW.diagnostico_confirmado_fxs, FALSE), COALESCE(NEW.ativo, TRUE), NEW.criado_por
        )
        RETURNING id INTO NEW.id;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE tb_pacientes
           SET nome_criptografado         = COALESCE(pgp_sym_encrypt(NEW.nome, v_chave), nome_criptografado),
               cpf_hash                   = NEW.cpf_hash,
               data_nascimento            = NEW.data_nascimento,
               sexo                       = NEW.sexo,
               etnia                      = NEW.etnia,
               uf_nascimento              = NEW.uf_nascimento,
               municipio_residencia       = NEW.municipio_residencia,
               uf_residencia              = NEW.uf_residencia,
               prematuro                  = NEW.prematuro,
               idade_gestacional_semanas  = NEW.idade_gestacional_semanas,
               peso_nascimento_gramas     = NEW.peso_nascimento_gramas,
               escolaridade               = NEW.escolaridade,
               tem_diagnostico_autismo    = NEW.tem_diagnostico_autismo,
               tem_diagnostico_tdah       = NEW.tem_diagnostico_tdah,
               outras_comorbidades        = NEW.outras_comorbidades,
               medicamentos_uso           = NEW.medicamentos_uso,
               acompanhante_id            = NEW.acompanhante_id,
               grau_parentesco            = NEW.grau_parentesco,
               diagnostico_confirmado_fxs = NEW.diagnostico_confirmado_fxs,
               ativo                      = NEW.ativo,
               criado_por                 = NEW.criado_por
         WHERE id = OLD.id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7.7 fn_avaliacoes_dml()
CREATE OR REPLACE FUNCTION fn_avaliacoes_dml()
RETURNS TRIGGER AS $$
DECLARE
    v_chave TEXT := current_setting('app.pgp_key', true);
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO tb_avaliacoes (
            paciente_id, usuario_id, data_avaliacao,
            diagnostico_previo_fxs, score_criptografado, observacoes, status
        ) VALUES (
            NEW.paciente_id, NEW.usuario_id, COALESCE(NEW.data_avaliacao, NOW()),
            COALESCE(NEW.diagnostico_previo_fxs, FALSE),
            CASE WHEN NEW.score_final IS NOT NULL
                 THEN pgp_sym_encrypt(NEW.score_final::text, v_chave) END,
            NEW.observacoes, COALESCE(NEW.status, 'rascunho')
        )
        RETURNING id INTO NEW.id;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE tb_avaliacoes
           SET paciente_id            = NEW.paciente_id,
               usuario_id             = NEW.usuario_id,
               diagnostico_previo_fxs = NEW.diagnostico_previo_fxs,
               -- COALESCE evita que NULL sobrescreva um score já existente
               score_criptografado    = COALESCE(
                                            CASE WHEN NEW.score_final IS NOT NULL
                                                 THEN pgp_sym_encrypt(NEW.score_final::text, v_chave) END,
                                            score_criptografado),
               observacoes            = NEW.observacoes,
               status                 = NEW.status
         WHERE id = OLD.id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 8. TRIGGERS
-- =============================================================================

-- bcrypt da senha
DROP TRIGGER IF EXISTS trg_hash_senha_usuario ON usuarios;
CREATE TRIGGER trg_hash_senha_usuario
    BEFORE INSERT OR UPDATE OF senha ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_hash_senha_usuario();

-- atualizado_em = NOW()
DROP TRIGGER IF EXISTS trg_usuarios_upd ON usuarios;
CREATE TRIGGER trg_usuarios_upd
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_pacientes_upd ON tb_pacientes;
CREATE TRIGGER trg_pacientes_upd
    BEFORE UPDATE ON tb_pacientes
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_acompanhantes_upd ON tb_acompanhantes;
CREATE TRIGGER trg_acompanhantes_upd
    BEFORE UPDATE ON tb_acompanhantes
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_avaliacoes_upd ON tb_avaliacoes;
CREATE TRIGGER trg_avaliacoes_upd
    BEFORE UPDATE ON tb_avaliacoes
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- INSTEAD OF nas views (criptografia transparente)
DROP TRIGGER IF EXISTS trg_acompanhantes_dml ON acompanhantes;
CREATE TRIGGER trg_acompanhantes_dml
    INSTEAD OF INSERT OR UPDATE ON acompanhantes
    FOR EACH ROW EXECUTE FUNCTION fn_acompanhantes_dml();

DROP TRIGGER IF EXISTS trg_pacientes_dml ON pacientes;
CREATE TRIGGER trg_pacientes_dml
    INSTEAD OF INSERT OR UPDATE ON pacientes
    FOR EACH ROW EXECUTE FUNCTION fn_pacientes_dml();

DROP TRIGGER IF EXISTS trg_avaliacoes_dml ON avaliacoes;
CREATE TRIGGER trg_avaliacoes_dml
    INSTEAD OF INSERT OR UPDATE ON avaliacoes
    FOR EACH ROW EXECUTE FUNCTION fn_avaliacoes_dml();

-- =============================================================================
-- 6. VIEW MATERIALIZADA — Dashboard anonimizado (RF07)
--    Sem dado pessoal identificável: apenas contagens e percentuais.
-- =============================================================================
CREATE MATERIALIZED VIEW vw_dashboard_anonimizado AS
SELECT
    s.descricao                                         AS sintoma,
    p.sexo,
    DATE_PART('year', AGE(p.data_nascimento))::INT      AS idade_anos,
    p.etnia,
    p.uf_residencia,
    COUNT(*)                                            AS total_avaliacoes,
    COUNT(*) FILTER (WHERE rc.presente)                 AS total_presentes,
    ROUND(100.0 * COUNT(*) FILTER (WHERE rc.presente)
          / NULLIF(COUNT(*), 0), 2)                     AS prevalencia_pct,
    pt.versao                                           AS versao_parametro
FROM respostas_checklist rc
JOIN tb_avaliacoes a ON a.id = rc.avaliacao_id AND a.status = 'finalizada'
JOIN tb_pacientes  p ON p.id = a.paciente_id
JOIN sintomas      s ON s.id = rc.sintoma_id
LEFT JOIN parametro_triagem pt ON pt.sexo = p.sexo AND pt.ativo = TRUE
GROUP BY s.descricao, p.sexo, idade_anos, p.etnia, p.uf_residencia, pt.versao;

-- Índice UNIQUE exigido para REFRESH ... CONCURRENTLY
CREATE UNIQUE INDEX idx_dashboard_anon_unico
    ON vw_dashboard_anonimizado (sintoma, sexo, idade_anos, etnia, uf_residencia, versao_parametro);

-- Atualizar com:  REFRESH MATERIALIZED VIEW CONCURRENTLY vw_dashboard_anonimizado;

-- Fim da Parte 2.
