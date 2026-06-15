-- ============================================================================
-- CITO — Script DDL completo (criar o banco do zero)
-- ============================================================================
-- Banco: PostgreSQL 17 (Supabase). Schema: public.
--
-- Recria toda a estrutura: extensões, tabelas, índices, views, funções,
-- gatilhos, view materializada, RLS e dados-semente (12 sintomas, parâmetros
-- de triagem e um usuário administrador inicial).
--
-- Ordem das seções respeita as dependências (tabelas -> funções -> views ->
-- gatilhos -> matview -> RLS -> seed). O script é idempotente: pode ser
-- executado mais de uma vez sem erro (IF NOT EXISTS / CREATE OR REPLACE /
-- ON CONFLICT DO NOTHING).
--
-- Observação sobre criptografia: os nomes de pacientes/acompanhantes são
-- cifrados com PGP simétrico usando a chave injetada na sessão em
-- 'app.pgp_key'. A aplicação faz isso automaticamente; para testar manualmente:
--     SELECT set_config('app.pgp_key', 'SUA_CHAVE', false);
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extensões
-- ----------------------------------------------------------------------------
-- No Supabase as extensões ficam no schema "extensions". O search_path abaixo
-- garante que pgp_sym_encrypt/decrypt e crypt/gen_salt sejam resolvidos sem
-- qualificação ao longo de todo o script (e também em Postgres puro).
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm  WITH SCHEMA extensions;

SET search_path TO public, extensions;

-- ----------------------------------------------------------------------------
-- 1. Tabelas
-- ----------------------------------------------------------------------------

-- 1.1 usuarios (profissionais de saúde / administradores)
CREATE TABLE IF NOT EXISTS usuarios (
    id              SERIAL      PRIMARY KEY,
    nome            VARCHAR     NOT NULL,
    email           VARCHAR     NOT NULL UNIQUE,
    crm             VARCHAR     UNIQUE,
    especialidade   VARCHAR,
    senha           TEXT        NOT NULL,
    tipo            VARCHAR     CHECK (tipo IN ('medico', 'admin')),
    ativo           BOOLEAN     NOT NULL DEFAULT true,
    ultimo_acesso   TIMESTAMP,
    criado_em       TIMESTAMP   NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMP   NOT NULL DEFAULT now()
);

-- 1.2 tb_acompanhantes (responsável/familiar do paciente)
CREATE TABLE IF NOT EXISTS tb_acompanhantes (
    id                  SERIAL      PRIMARY KEY,
    nome_criptografado  BYTEA       NOT NULL,
    cpf_hash            TEXT        UNIQUE,
    telefone            VARCHAR,
    email               VARCHAR,
    criado_em           TIMESTAMP   NOT NULL DEFAULT now(),
    atualizado_em       TIMESTAMP   NOT NULL DEFAULT now()
);

-- 1.3 tb_pacientes (indivíduo submetido à triagem)
CREATE TABLE IF NOT EXISTS tb_pacientes (
    id                          SERIAL      PRIMARY KEY,
    nome_criptografado          BYTEA       NOT NULL,
    cpf_hash                    TEXT        UNIQUE,
    data_nascimento             DATE        NOT NULL CHECK (data_nascimento <= CURRENT_DATE),
    sexo                        CHAR(1)     NOT NULL CHECK (sexo IN ('M', 'F')),
    etnia                       VARCHAR     CHECK (etnia IN (
                                                'branca', 'preta', 'parda',
                                                'amarela', 'indigena', 'nao_declarado')),
    uf_nascimento               CHAR(2),
    municipio_residencia        VARCHAR,
    uf_residencia               CHAR(2),
    prematuro                   BOOLEAN,
    idade_gestacional_semanas   SMALLINT    CHECK (idade_gestacional_semanas BETWEEN 20 AND 45),
    peso_nascimento_gramas      SMALLINT,
    escolaridade                VARCHAR     CHECK (escolaridade IN (
                                                'sem_escolaridade', 'educacao_infantil',
                                                'fundamental_incompleto', 'fundamental_completo',
                                                'medio_incompleto', 'medio_completo',
                                                'superior_incompleto', 'superior_completo',
                                                'nao_informado')),
    tem_diagnostico_autismo     BOOLEAN     NOT NULL DEFAULT false,
    tem_diagnostico_tdah        BOOLEAN     NOT NULL DEFAULT false,
    outras_comorbidades         TEXT,
    medicamentos_uso            TEXT,
    acompanhante_id             INTEGER     REFERENCES tb_acompanhantes(id),
    grau_parentesco             VARCHAR,
    diagnostico_confirmado_fxs  BOOLEAN     NOT NULL DEFAULT false,
    ativo                       BOOLEAN     NOT NULL DEFAULT true,
    criado_por                  INTEGER     REFERENCES usuarios(id),
    telefone                    VARCHAR,
    criado_em                   TIMESTAMP   NOT NULL DEFAULT now(),
    atualizado_em               TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pacientes_cpf_hash      ON tb_pacientes (cpf_hash);
CREATE INDEX IF NOT EXISTS idx_pacientes_acompanhante  ON tb_pacientes (acompanhante_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_criado_por    ON tb_pacientes (criado_por);

-- 1.4 tb_avaliacoes (uma triagem aplicada a um paciente)
CREATE TABLE IF NOT EXISTS tb_avaliacoes (
    id                      SERIAL      PRIMARY KEY,
    paciente_id             INTEGER     NOT NULL REFERENCES tb_pacientes(id),
    usuario_id              INTEGER     NOT NULL REFERENCES usuarios(id),
    acompanhante_id         INTEGER     REFERENCES tb_acompanhantes(id),
    data_avaliacao          TIMESTAMP   NOT NULL DEFAULT now(),
    diagnostico_previo_fxs  BOOLEAN     NOT NULL DEFAULT false,
    score_final             NUMERIC,
    grau_parentesco         VARCHAR,
    observacoes             TEXT,
    status                  VARCHAR     NOT NULL DEFAULT 'rascunho'
                                        CHECK (status IN ('rascunho', 'finalizada', 'cancelada')),
    criado_em               TIMESTAMP   NOT NULL DEFAULT now(),
    atualizado_em           TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_paciente ON tb_avaliacoes (paciente_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_usuario  ON tb_avaliacoes (usuario_id);

-- 1.5 sintomas (checklist clínico)
CREATE TABLE IF NOT EXISTS sintomas (
    id                  SERIAL      PRIMARY KEY,
    descricao           VARCHAR     NOT NULL,
    descricao_en        VARCHAR,
    peso                NUMERIC     NOT NULL,
    peso_feminino       NUMERIC,
    exclusivo_masculino BOOLEAN     NOT NULL DEFAULT false,
    ativo               BOOLEAN     NOT NULL DEFAULT true
);

-- 1.6 respostas_checklist (N:M entre avaliações e sintomas)
CREATE TABLE IF NOT EXISTS respostas_checklist (
    avaliacao_id    INTEGER     NOT NULL REFERENCES tb_avaliacoes(id),
    sintoma_id      INTEGER     NOT NULL REFERENCES sintomas(id),
    presente        BOOLEAN     NOT NULL,
    observacao      VARCHAR,
    PRIMARY KEY (avaliacao_id, sintoma_id)
);

CREATE INDEX IF NOT EXISTS idx_respostas_sintoma ON respostas_checklist (sintoma_id);

-- 1.7 parametro_triagem (limiares/AUC por sexo)
CREATE TABLE IF NOT EXISTS parametro_triagem (
    id              SERIAL      PRIMARY KEY,
    sexo            CHAR(1)     NOT NULL CHECK (sexo IN ('M', 'F')),
    limiar_score    NUMERIC     NOT NULL,
    auc             NUMERIC,
    sensibilidade   NUMERIC,
    versao          VARCHAR     UNIQUE,
    ativo           BOOLEAN     NOT NULL DEFAULT true,
    referencia      TEXT,
    criado_em       TIMESTAMP   NOT NULL DEFAULT now()
);

-- No máximo um parâmetro ativo por sexo
CREATE UNIQUE INDEX IF NOT EXISTS uq_parametro_ativo_por_sexo
    ON parametro_triagem (sexo)
    WHERE ativo;

-- 1.8 tb_historico_familiar (1:1 com avaliação)
CREATE TABLE IF NOT EXISTS tb_historico_familiar (
    id                          SERIAL      PRIMARY KEY,
    avaliacao_id                INTEGER     NOT NULL UNIQUE REFERENCES tb_avaliacoes(id),
    deficiencia_intelectual     BOOLEAN     NOT NULL DEFAULT false,
    falencia_ovariana_precoce   BOOLEAN     NOT NULL DEFAULT false,
    autismo_na_familia          BOOLEAN     NOT NULL DEFAULT false,
    epilepsia                   BOOLEAN     NOT NULL DEFAULT false,
    infertilidade_masculina     BOOLEAN     NOT NULL DEFAULT false,
    menopausa_precoce           BOOLEAN     NOT NULL DEFAULT false,
    abortos_recorrentes         BOOLEAN     NOT NULL DEFAULT false,
    tremor_ataxia_familiar      BOOLEAN     NOT NULL DEFAULT false,
    descricao_outros            TEXT,
    criado_em                   TIMESTAMP   NOT NULL DEFAULT now()
);

-- 1.9 tb_encaminhamentos
CREATE TABLE IF NOT EXISTS tb_encaminhamentos (
    id                      SERIAL      PRIMARY KEY,
    avaliacao_id            INTEGER     NOT NULL REFERENCES tb_avaliacoes(id),
    tipo                    VARCHAR     CHECK (tipo IN (
                                            'fonoaudiologia', 'psicologia',
                                            'terapia_ocupacional', 'psiquiatria',
                                            'neuropediatria', 'genetica_medica',
                                            'exame_fmr1', 'fisioterapia', 'outro')),
    justificativa           TEXT,
    gerado_automaticamente  BOOLEAN     NOT NULL DEFAULT true,
    criado_em               TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_encaminhamentos_aval ON tb_encaminhamentos (avaliacao_id);

-- 1.10 tb_agendamentos
CREATE TABLE IF NOT EXISTS tb_agendamentos (
    id          SERIAL      PRIMARY KEY,
    paciente_id INTEGER     REFERENCES tb_pacientes(id),
    usuario_id  INTEGER     REFERENCES usuarios(id),
    titulo      VARCHAR     NOT NULL,
    tipo        VARCHAR,
    data_hora   TIMESTAMP   NOT NULL,
    status      VARCHAR     NOT NULL DEFAULT 'confirmado'
                            CHECK (status IN (
                                'confirmado', 'aguardando', 'em_atendimento',
                                'pendente', 'cancelado')),
    observacoes TEXT,
    criado_em   TIMESTAMP   NOT NULL DEFAULT now()
);

-- 1.11 tb_log_sessoes (duracao_segundos é coluna GERADA)
CREATE TABLE IF NOT EXISTS tb_log_sessoes (
    id                  BIGSERIAL   PRIMARY KEY,
    usuario_id          INTEGER     REFERENCES usuarios(id),
    token_sessao_hash   TEXT,
    ip_origem           INET,
    user_agent          TEXT,
    iniciada_em         TIMESTAMP   NOT NULL DEFAULT now(),
    encerrada_em        TIMESTAMP,
    tipo_encerramento   VARCHAR     CHECK (tipo_encerramento IN (
                                        'logout', 'timeout', 'forcado', 'expirado')),
    duracao_segundos    INTEGER     GENERATED ALWAYS AS (
                            CASE WHEN encerrada_em IS NOT NULL
                                 THEN EXTRACT(epoch FROM (encerrada_em - iniciada_em))::integer
                            END) STORED
);

CREATE INDEX IF NOT EXISTS idx_log_sessoes_usuario ON tb_log_sessoes (usuario_id);

-- 1.12 tb_log_tentativas_login
CREATE TABLE IF NOT EXISTS tb_log_tentativas_login (
    id              BIGSERIAL   PRIMARY KEY,
    email_tentado   VARCHAR     NOT NULL,
    ip_origem       INET,
    user_agent      TEXT,
    sucesso         BOOLEAN     NOT NULL,
    motivo_falha    VARCHAR     CHECK (motivo_falha IN (
                                    'senha_incorreta', 'usuario_inativo',
                                    'usuario_nao_encontrado', 'conta_bloqueada',
                                    'token_invalido')),
    usuario_id      INTEGER     REFERENCES usuarios(id),
    sessao_id       BIGINT      REFERENCES tb_log_sessoes(id),
    tentado_em      TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_ip ON tb_log_tentativas_login (ip_origem, tentado_em);

-- 1.13 tb_log_analises (duracao_segundos é coluna GERADA)
CREATE TABLE IF NOT EXISTS tb_log_analises (
    id                  BIGSERIAL   PRIMARY KEY,
    avaliacao_id        INTEGER     NOT NULL REFERENCES tb_avaliacoes(id),
    usuario_id          INTEGER     REFERENCES usuarios(id),
    sessao_id           BIGINT      REFERENCES tb_log_sessoes(id),
    iniciada_em         TIMESTAMP   NOT NULL DEFAULT now(),
    finalizada_em       TIMESTAMP,
    status_final        VARCHAR     NOT NULL DEFAULT 'em_andamento'
                                    CHECK (status_final IN (
                                        'concluida', 'cancelada',
                                        'timeout', 'em_andamento')),
    duracao_segundos    INTEGER     GENERATED ALWAYS AS (
                            CASE WHEN finalizada_em IS NOT NULL
                                 THEN EXTRACT(epoch FROM (finalizada_em - iniciada_em))::integer
                            END) STORED,
    score_gerado        NUMERIC,
    recomendou_exame    BOOLEAN
);

CREATE INDEX IF NOT EXISTS idx_log_analises_aval ON tb_log_analises (avaliacao_id);

-- 1.14 tb_auditoria
CREATE TABLE IF NOT EXISTS tb_auditoria (
    id                  BIGSERIAL   PRIMARY KEY,
    usuario_id          INTEGER     REFERENCES usuarios(id),
    sessao_id           BIGINT      REFERENCES tb_log_sessoes(id),
    acao                VARCHAR     CHECK (acao IN (
                                        'PACIENTE_CRIADO', 'PACIENTE_EDITADO', 'PACIENTE_DESATIVADO',
                                        'AVALIACAO_CRIADA', 'AVALIACAO_FINALIZADA', 'SCORE_CALCULADO',
                                        'ACOMPANHANTE_CRIADO', 'ACOMPANHANTE_EDITADO',
                                        'USUARIO_CRIADO', 'USUARIO_EDITADO', 'EXPORTACAO')),
    tabela_afetada      VARCHAR,
    registro_id         VARCHAR,
    dados_anteriores    JSONB,
    dados_novos         JSONB,
    ip_address          INET,
    criado_em           TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON tb_auditoria (usuario_id);

-- ----------------------------------------------------------------------------
-- 2. Funções
-- ----------------------------------------------------------------------------

-- 2.1 Atualiza atualizado_em em qualquer UPDATE
CREATE OR REPLACE FUNCTION fn_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$;

-- 2.2 INSTEAD OF INSERT da view acompanhantes (cifra o nome)
CREATE OR REPLACE FUNCTION fn_acompanhantes_insert() RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public, extensions AS $$
DECLARE v_id integer;
BEGIN
    INSERT INTO tb_acompanhantes (nome_criptografado, cpf_hash, telefone, email)
    VALUES (
        pgp_sym_encrypt(NEW.nome, current_setting('app.pgp_key', true)),
        NEW.cpf_hash, NEW.telefone, NEW.email
    )
    RETURNING id INTO v_id;
    NEW.id := v_id;
    RETURN NEW;
END;
$$;

-- 2.3 INSTEAD OF INSERT da view pacientes (cifra o nome)
CREATE OR REPLACE FUNCTION fn_pacientes_insert() RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public, extensions AS $$
DECLARE v_id integer;
BEGIN
    INSERT INTO tb_pacientes (
        nome_criptografado, cpf_hash, data_nascimento, sexo, etnia,
        uf_nascimento, municipio_residencia, uf_residencia, prematuro,
        idade_gestacional_semanas, peso_nascimento_gramas, escolaridade,
        tem_diagnostico_autismo, tem_diagnostico_tdah, outras_comorbidades,
        medicamentos_uso, acompanhante_id, grau_parentesco,
        diagnostico_confirmado_fxs, criado_por
    ) VALUES (
        pgp_sym_encrypt(NEW.nome, current_setting('app.pgp_key', true)),
        NEW.cpf_hash, NEW.data_nascimento, NEW.sexo, NEW.etnia,
        NEW.uf_nascimento, NEW.municipio_residencia, NEW.uf_residencia,
        COALESCE(NEW.prematuro, false), NEW.idade_gestacional_semanas,
        NEW.peso_nascimento_gramas, NEW.escolaridade,
        COALESCE(NEW.tem_diagnostico_autismo, false),
        COALESCE(NEW.tem_diagnostico_tdah, false),
        NEW.outras_comorbidades, NEW.medicamentos_uso, NEW.acompanhante_id,
        NEW.grau_parentesco, COALESCE(NEW.diagnostico_confirmado_fxs, false),
        NEW.criado_por
    )
    RETURNING id INTO v_id;
    NEW.id := v_id;
    RETURN NEW;
END;
$$;

-- 2.4 Cálculo do escore de triagem (persiste score e finaliza a avaliação)
CREATE OR REPLACE FUNCTION fn_calcular_score_triagem(p_avaliacao_id integer)
RETURNS TABLE(score_final numeric, limiar_usado numeric, recomenda_exame boolean, versao_param character varying)
LANGUAGE plpgsql AS $$
DECLARE
    v_sexo        CHAR(1);
    v_score       NUMERIC(5,4) := 0;
    v_limiar      NUMERIC(4,2);
    v_versao      VARCHAR;
    v_recomenda   BOOLEAN;
    v_diagnostico BOOLEAN;
BEGIN
    SELECT p.sexo, a.diagnostico_previo_fxs
    INTO v_sexo, v_diagnostico
    FROM tb_avaliacoes a
    JOIN tb_pacientes p ON p.id = a.paciente_id
    WHERE a.id = p_avaliacao_id;

    SELECT limiar_score, versao
    INTO v_limiar, v_versao
    FROM parametro_triagem
    WHERE sexo = v_sexo AND ativo = TRUE
    LIMIT 1;

    SELECT COALESCE(SUM(
        CASE WHEN rc.presente THEN
            CASE WHEN v_sexo = 'M' THEN s.peso
                 ELSE COALESCE(s.peso_feminino, 0)
            END
        ELSE 0 END
    ), 0)
    INTO v_score
    FROM respostas_checklist rc
    JOIN sintomas s ON s.id = rc.sintoma_id
    WHERE rc.avaliacao_id = p_avaliacao_id
      AND s.ativo = TRUE
      AND (v_sexo = 'M' OR s.exclusivo_masculino = FALSE);

    v_recomenda := (NOT COALESCE(v_diagnostico, FALSE)) AND (v_score >= v_limiar);

    UPDATE tb_avaliacoes
    SET score_final = v_score,
        status      = 'finalizada'
    WHERE id = p_avaliacao_id;

    UPDATE tb_log_analises
    SET finalizada_em    = NOW(),
        status_final     = 'concluida',
        score_gerado     = v_score,
        recomendou_exame = v_recomenda
    WHERE avaliacao_id = p_avaliacao_id
      AND status_final = 'em_andamento';

    RETURN QUERY SELECT v_score, v_limiar, v_recomenda, v_versao;
END;
$$;

-- 2.5 Login (verifica senha bcrypt e abre sessão)
CREATE OR REPLACE FUNCTION fn_login(p_email text, p_senha text, p_user_agent text DEFAULT NULL::text)
RETURNS TABLE(id integer, nome character varying, email character varying, tipo character varying, crm character varying, sessao_id bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions AS $$
DECLARE
  v_user usuarios%ROWTYPE;
  v_sessao BIGINT;
BEGIN
  SELECT * INTO v_user FROM usuarios WHERE usuarios.email = LOWER(p_email);

  IF NOT FOUND THEN
    INSERT INTO tb_log_tentativas_login(email_tentado, user_agent, sucesso, motivo_falha)
    VALUES (LOWER(p_email), p_user_agent, FALSE, 'usuario_nao_encontrado');
    RETURN;
  END IF;

  IF NOT v_user.ativo THEN
    INSERT INTO tb_log_tentativas_login(email_tentado, user_agent, sucesso, motivo_falha, usuario_id)
    VALUES (LOWER(p_email), p_user_agent, FALSE, 'usuario_inativo', v_user.id);
    RETURN;
  END IF;

  IF v_user.senha <> crypt(p_senha, v_user.senha) THEN
    INSERT INTO tb_log_tentativas_login(email_tentado, user_agent, sucesso, motivo_falha, usuario_id)
    VALUES (LOWER(p_email), p_user_agent, FALSE, 'senha_incorreta', v_user.id);
    RETURN;
  END IF;

  INSERT INTO tb_log_sessoes(usuario_id, user_agent, token_sessao_hash)
  VALUES (v_user.id, p_user_agent, md5(gen_random_uuid()::text))
  RETURNING tb_log_sessoes.id INTO v_sessao;

  INSERT INTO tb_log_tentativas_login(email_tentado, user_agent, sucesso, usuario_id, sessao_id)
  VALUES (LOWER(p_email), p_user_agent, TRUE, v_user.id, v_sessao);

  UPDATE usuarios SET ultimo_acesso = NOW() WHERE usuarios.id = v_user.id;

  RETURN QUERY SELECT v_user.id, v_user.nome, v_user.email, v_user.tipo, v_user.crm, v_sessao;
END;
$$;

-- 2.6 Logout (encerra a sessão)
CREATE OR REPLACE FUNCTION fn_logout(p_sessao_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public AS $$
BEGIN
  UPDATE tb_log_sessoes
  SET encerrada_em = NOW(), tipo_encerramento = 'logout'
  WHERE id = p_sessao_id AND encerrada_em IS NULL;
END;
$$;

-- 2.7 Registro de auditoria (chamada explicitamente pela aplicação)
CREATE OR REPLACE FUNCTION fn_registrar_auditoria(
    p_usuario_id integer, p_sessao_id bigint, p_acao character varying,
    p_tabela character varying, p_registro_id character varying,
    p_antes jsonb DEFAULT NULL::jsonb, p_depois jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public AS $$
BEGIN
  INSERT INTO tb_auditoria(usuario_id, sessao_id, acao, tabela_afetada, registro_id, dados_anteriores, dados_novos)
  VALUES (p_usuario_id, p_sessao_id, p_acao, p_tabela, p_registro_id, p_antes, p_depois);
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Views (camada de leitura com descriptografia transparente)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW pacientes AS
 SELECT p.id,
    p.nome_criptografado,
    p.cpf_hash,
    p.data_nascimento,
    date_part('year'::text, age(p.data_nascimento::timestamp with time zone))::integer AS idade_anos,
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
    p.grau_parentesco,
    a.nome_criptografado AS acompanhante_nome_criptografado,
    a.telefone AS acompanhante_telefone,
    a.email AS acompanhante_email,
    p.diagnostico_confirmado_fxs,
    p.ativo,
    p.criado_por,
    p.criado_em,
    p.atualizado_em,
    pgp_sym_decrypt(p.nome_criptografado, current_setting('app.pgp_key', true))::text AS nome
   FROM tb_pacientes p
     LEFT JOIN tb_acompanhantes a ON a.id = p.acompanhante_id;

CREATE OR REPLACE VIEW acompanhantes AS
 SELECT id,
    nome_criptografado,
    cpf_hash,
    telefone,
    email,
    criado_em,
    atualizado_em,
    pgp_sym_decrypt(nome_criptografado, current_setting('app.pgp_key', true))::text AS nome
   FROM tb_acompanhantes;

CREATE OR REPLACE VIEW avaliacoes AS
 SELECT a.id,
    a.paciente_id,
    a.usuario_id,
    a.data_avaliacao,
    a.diagnostico_previo_fxs,
    a.score_final,
    a.observacoes,
    a.status,
    a.criado_em,
    a.atualizado_em,
    CASE
      WHEN a.score_final IS NULL THEN NULL::boolean
      WHEN a.diagnostico_previo_fxs THEN false
      WHEN a.score_final >= (
            SELECT pt.limiar_score
            FROM parametro_triagem pt
            WHERE pt.ativo
              AND pt.sexo = (SELECT pac.sexo FROM tb_pacientes pac WHERE pac.id = a.paciente_id)
            LIMIT 1
      ) THEN true
      ELSE false
    END AS recomenda_exame
   FROM tb_avaliacoes a;

-- ----------------------------------------------------------------------------
-- 4. Gatilhos
-- ----------------------------------------------------------------------------

-- INSTEAD OF INSERT nas views (cifragem do nome)
DROP TRIGGER IF EXISTS trg_acompanhantes_insert ON acompanhantes;
CREATE TRIGGER trg_acompanhantes_insert
    INSTEAD OF INSERT ON acompanhantes
    FOR EACH ROW EXECUTE FUNCTION fn_acompanhantes_insert();

DROP TRIGGER IF EXISTS trg_pacientes_insert ON pacientes;
CREATE TRIGGER trg_pacientes_insert
    INSTEAD OF INSERT ON pacientes
    FOR EACH ROW EXECUTE FUNCTION fn_pacientes_insert();

-- BEFORE UPDATE para manter atualizado_em
DROP TRIGGER IF EXISTS trg_acompanhantes_upd ON tb_acompanhantes;
CREATE TRIGGER trg_acompanhantes_upd
    BEFORE UPDATE ON tb_acompanhantes
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_pacientes_upd ON tb_pacientes;
CREATE TRIGGER trg_pacientes_upd
    BEFORE UPDATE ON tb_pacientes
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_avaliacoes_upd ON tb_avaliacoes;
CREATE TRIGGER trg_avaliacoes_upd
    BEFORE UPDATE ON tb_avaliacoes
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_usuarios_upd ON usuarios;
CREATE TRIGGER trg_usuarios_upd
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. View materializada (dashboard anonimizado)
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS vw_dashboard_anonimizado AS
 SELECT s.descricao AS sintoma,
    p.sexo,
    (date_part('year'::text, age((p.data_nascimento)::timestamp with time zone)))::integer AS idade_anos,
    p.etnia,
    p.uf_residencia,
    count(rc.avaliacao_id) AS total_avaliacoes,
    sum(CASE WHEN rc.presente THEN 1 ELSE 0 END) AS total_presentes,
    round(((100.0 * (sum(CASE WHEN rc.presente THEN 1 ELSE 0 END))::numeric)
        / (NULLIF(count(rc.avaliacao_id), 0))::numeric), 2) AS prevalencia_pct,
    pt.versao AS versao_parametro
   FROM respostas_checklist rc
     JOIN tb_avaliacoes a ON a.id = rc.avaliacao_id AND a.status::text = 'finalizada'::text
     JOIN tb_pacientes p ON p.id = a.paciente_id
     JOIN sintomas s ON s.id = rc.sintoma_id
     JOIN parametro_triagem pt ON pt.sexo = p.sexo AND pt.ativo = true
  GROUP BY s.descricao, p.sexo,
    ((date_part('year'::text, age((p.data_nascimento)::timestamp with time zone)))::integer),
    p.etnia, p.uf_residencia, pt.versao;

-- Índice único: permite REFRESH CONCURRENTLY e impõe unicidade dos agregados
CREATE UNIQUE INDEX IF NOT EXISTS uq_dash_anon
    ON vw_dashboard_anonimizado (sintoma, sexo, idade_anos, etnia, uf_residencia, versao_parametro);

-- ----------------------------------------------------------------------------
-- 6. Row Level Security (apenas nas tabelas de log/auditoria, sem políticas:
--    nega acesso a quem não for o proprietário; escrita via funções SECURITY DEFINER)
-- ----------------------------------------------------------------------------
ALTER TABLE tb_log_sessoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_log_tentativas_login ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_log_analises         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_auditoria            ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 7. Dados-semente
-- ----------------------------------------------------------------------------

-- 7.1 Sintomas (modelo ROMERO 2025 — 12 sinais, pesos por sexo)
INSERT INTO sintomas (id, descricao, descricao_en, peso, peso_feminino, exclusivo_masculino, ativo) VALUES
    (1,  'Deficiência intelectual',                 'Intellectual disability',             0.32, 0.20, false, true),
    (2,  'Face alongada / orelhas salientes',       'Elongated face / prominent ears',     0.29, 0.09, false, true),
    (3,  'Macroorquidismo',                         'Macroorchidism',                      0.26, NULL, true,  true),
    (4,  'Hipermobilidade articular',               'Joint hypermobility',                 0.19, 0.04, false, true),
    (5,  'Dificuldades de aprendizagem',            'Learning difficulties',               0.18, 0.28, false, true),
    (6,  'Déficit de atenção',                      'Attention deficit',                   0.17, 0.12, false, true),
    (7,  'Movimentos repetitivos (estereotipias)',  'Repetitive movements (stereotypies)', 0.17, 0.05, false, true),
    (8,  'Atraso na fala',                          'Speech delay',                        0.14, 0.01, false, true),
    (9,  'Hiperatividade',                          'Hyperactivity',                       0.12, 0.04, false, true),
    (10, 'Evita contato visual',                    'Avoids eye contact',                  0.06, 0.08, false, true),
    (11, 'Evita contato físico',                    'Avoids physical contact',             0.04, 0.07, false, true),
    (12, 'Agressividade',                           'Aggressiveness',                      0.01, 0.02, false, true)
ON CONFLICT (id) DO NOTHING;
SELECT setval('sintomas_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sintomas));

-- 7.2 Parâmetros de triagem (limiares/AUC por sexo)
INSERT INTO parametro_triagem (id, sexo, limiar_score, auc, sensibilidade, versao, ativo, referencia) VALUES
    (1, 'M', 0.56, 0.73, 0.95, 'ROMERO_2025_v1_M', true,
        'Romero et al. (2025). Fragile X Syndrome in Brazil. medRxiv doi: 10.1101/2025.10.21.25338500'),
    (2, 'F', 0.55, 0.76, 0.95, 'ROMERO_2025_v1_F', true,
        'Romero et al. (2025). Fragile X Syndrome in Brazil. medRxiv doi: 10.1101/2025.10.21.25338500')
ON CONFLICT (versao) DO NOTHING;
SELECT setval('parametro_triagem_id_seq', (SELECT COALESCE(MAX(id), 1) FROM parametro_triagem));

-- 7.3 Usuário administrador inicial (senha bcrypt).
--     ALTERE A SENHA após o primeiro login. Login: admin@cito.com / admin123
INSERT INTO usuarios (nome, email, senha, tipo, ativo)
VALUES ('Administrador', 'admin@cito.com', crypt('admin123', gen_salt('bf')), 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- Fim do script.
-- ============================================================================
