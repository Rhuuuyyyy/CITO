-- =============================================================================
-- Sistema SXF — Síndrome do X Frágil (Apoio ao Diagnóstico)
-- Parte 1 de 3 — Extensões, limpeza e criação de todas as tabelas
-- Inclui o seed dos 12 sintomas e dos parâmetros de triagem (Romero et al. 2025)
--
-- Ordem de execução no Supabase (SQL Editor):
--   1º  sxf_parte1_tabelas.sql       <-- este arquivo
--   2º  sxf_parte2_funcoes_views.sql
--   3º  sxf_parte3_rbac.sql          (opcional no Supabase)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensões necessárias
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- pgp_sym_encrypt / pgp_sym_decrypt / crypt
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- busca por similaridade (índices futuros)

-- -----------------------------------------------------------------------------
-- Limpeza (idempotência) — ordem inversa de dependência via CASCADE.
-- As views materializadas e comuns são removidas na Parte 2; aqui caem junto
-- com as tabelas por CASCADE caso já existam.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS tb_auditoria              CASCADE;
DROP TABLE IF EXISTS tb_log_analises           CASCADE;
DROP TABLE IF EXISTS tb_log_tentativas_login   CASCADE;
DROP TABLE IF EXISTS tb_log_sessoes            CASCADE;
DROP TABLE IF EXISTS tb_encaminhamentos        CASCADE;
DROP TABLE IF EXISTS tb_historico_familiar     CASCADE;
DROP TABLE IF EXISTS respostas_checklist       CASCADE;
DROP TABLE IF EXISTS tb_avaliacoes             CASCADE;
DROP TABLE IF EXISTS parametro_triagem         CASCADE;
DROP TABLE IF EXISTS sintomas                  CASCADE;
DROP TABLE IF EXISTS tb_pacientes              CASCADE;
DROP TABLE IF EXISTS tb_acompanhantes          CASCADE;
DROP TABLE IF EXISTS usuarios                  CASCADE;

-- =============================================================================
-- 3.1 usuarios — Profissionais médicos e administradores
--     A senha é convertida em hash bcrypt pelo trigger trg_hash_senha_usuario.
-- =============================================================================
CREATE TABLE usuarios (
    id              SERIAL       PRIMARY KEY,
    nome            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    crm             VARCHAR(20)  UNIQUE,
    especialidade   VARCHAR(100),
    senha           TEXT         NOT NULL,            -- SOMENTE hash bcrypt
    tipo            VARCHAR(20)  CHECK (tipo IN ('medico', 'admin')),
    ativo           BOOLEAN      DEFAULT TRUE,
    ultimo_acesso   TIMESTAMP,
    criado_em       TIMESTAMP    DEFAULT NOW(),
    atualizado_em   TIMESTAMP    DEFAULT NOW()
);

-- =============================================================================
-- 3.2 tb_acompanhantes — Responsáveis/acompanhantes dos pacientes
--     Nome cifrado (BYTEA). Acesso pela view "acompanhantes".
-- =============================================================================
CREATE TABLE tb_acompanhantes (
    id                  SERIAL       PRIMARY KEY,
    nome_criptografado  BYTEA        NOT NULL,        -- pgp_sym_encrypt
    cpf_hash            TEXT         UNIQUE,          -- SHA-256 do CPF (só dígitos)
    telefone            VARCHAR(20),
    email               VARCHAR(255),
    criado_em           TIMESTAMP    DEFAULT NOW(),
    atualizado_em       TIMESTAMP    DEFAULT NOW()
);

-- =============================================================================
-- 3.3 tb_pacientes — Tabela central de pacientes
--     Nome cifrado (BYTEA). Acesso pela view "pacientes".
-- =============================================================================
CREATE TABLE tb_pacientes (
    id                          SERIAL       PRIMARY KEY,
    nome_criptografado          BYTEA        NOT NULL,
    cpf_hash                    TEXT         UNIQUE,
    data_nascimento             DATE         NOT NULL CHECK (data_nascimento <= CURRENT_DATE),
    sexo                        CHAR(1)      NOT NULL CHECK (sexo IN ('M', 'F')),  -- determina os pesos do checklist
    etnia                       VARCHAR(30)  CHECK (etnia IN ('branca', 'preta', 'parda', 'amarela', 'indigena', 'nao_declarado')),
    uf_nascimento               CHAR(2),
    municipio_residencia        VARCHAR(100),
    uf_residencia               CHAR(2),
    prematuro                   BOOLEAN,
    idade_gestacional_semanas   SMALLINT     CHECK (idade_gestacional_semanas BETWEEN 20 AND 45),
    peso_nascimento_gramas      SMALLINT,
    -- Lista de escolaridade inferida (a doc indica CHECK mas não enumera). Ajustável.
    escolaridade                VARCHAR(50)  CHECK (escolaridade IN (
                                                'nao_alfabetizado', 'ensino_infantil',
                                                'fundamental_incompleto', 'fundamental_completo',
                                                'medio_incompleto', 'medio_completo',
                                                'superior_incompleto', 'superior_completo',
                                                'nao_informado')),
    tem_diagnostico_autismo     BOOLEAN      DEFAULT FALSE,
    tem_diagnostico_tdah        BOOLEAN      DEFAULT FALSE,
    outras_comorbidades         TEXT,
    medicamentos_uso            TEXT,
    acompanhante_id             INTEGER      REFERENCES tb_acompanhantes(id),
    grau_parentesco             VARCHAR(60),
    diagnostico_confirmado_fxs  BOOLEAN      DEFAULT FALSE,  -- TRUE = confirmado (PCR/Southern)
    ativo                       BOOLEAN      DEFAULT TRUE,    -- FALSE = arquivado (LGPD)
    criado_por                  INTEGER      REFERENCES usuarios(id),
    criado_em                   TIMESTAMP    DEFAULT NOW(),
    atualizado_em               TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_pacientes_acompanhante ON tb_pacientes (acompanhante_id);
CREATE INDEX idx_pacientes_criado_por   ON tb_pacientes (criado_por);

-- =============================================================================
-- 3.4 sintomas — Catálogo imutável dos 12 sintomas do checklist
--     Pesos derivados do modelo Random Forest (Romero et al. 2025).
--     Pesos DIFERENTES por sexo.
-- =============================================================================
CREATE TABLE sintomas (
    id                   SERIAL        PRIMARY KEY,
    descricao            VARCHAR(255)  NOT NULL,
    descricao_en         VARCHAR(255),
    peso                 NUMERIC(4,2)  NOT NULL,        -- peso MASCULINO (limiar 0,56)
    peso_feminino        NUMERIC(4,2),                  -- peso FEMININO (limiar 0,55); NULL se exclusivo_masculino
    exclusivo_masculino  BOOLEAN       DEFAULT FALSE,   -- TRUE só para Macroorquidismo
    ativo                BOOLEAN       DEFAULT TRUE
);

-- =============================================================================
-- 3.5 parametro_triagem — Limiares e métricas do modelo, por sexo
--     NUNCA hardcode no back-end: consultar esta tabela.
-- =============================================================================
CREATE TABLE parametro_triagem (
    id             SERIAL        PRIMARY KEY,
    sexo           CHAR(1)       CHECK (sexo IN ('M', 'F')),
    limiar_score   NUMERIC(4,2)  NOT NULL,
    auc            NUMERIC(4,2),
    sensibilidade  NUMERIC(4,2),
    versao         VARCHAR(30)   UNIQUE,
    ativo          BOOLEAN       DEFAULT TRUE,
    referencia     TEXT,
    criado_em      TIMESTAMP     DEFAULT NOW()
);

-- =============================================================================
-- 3.6 tb_avaliacoes — Registro central de cada atendimento clínico
--     Score cifrado (BYTEA). Acesso pela view "avaliacoes".
-- =============================================================================
CREATE TABLE tb_avaliacoes (
    id                      SERIAL       PRIMARY KEY,
    paciente_id             INTEGER      NOT NULL REFERENCES tb_pacientes(id),
    usuario_id              INTEGER      NOT NULL REFERENCES usuarios(id),
    data_avaliacao          TIMESTAMP    DEFAULT NOW(),
    diagnostico_previo_fxs  BOOLEAN      DEFAULT FALSE,  -- TRUE suprime recomendação de exame
    score_criptografado     BYTEA,                       -- pgp_sym_encrypt(score::text, chave)
    observacoes             TEXT,
    status                  VARCHAR(20)  DEFAULT 'rascunho'
                                         CHECK (status IN ('rascunho', 'finalizada', 'cancelada')),
    criado_em               TIMESTAMP    DEFAULT NOW(),
    atualizado_em           TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_avaliacoes_paciente ON tb_avaliacoes (paciente_id);
CREATE INDEX idx_avaliacoes_usuario  ON tb_avaliacoes (usuario_id);

-- =============================================================================
-- 3.7 respostas_checklist — Junção N:M entre avaliações e sintomas
--     Base do cálculo do score (Xij = presente).
-- =============================================================================
CREATE TABLE respostas_checklist (
    avaliacao_id  INTEGER       NOT NULL REFERENCES tb_avaliacoes(id) ON DELETE CASCADE,
    sintoma_id    INTEGER       NOT NULL REFERENCES sintomas(id),
    presente      BOOLEAN       NOT NULL,           -- TRUE = Xij 1 | FALSE = Xij 0
    observacao    VARCHAR(500),
    PRIMARY KEY (avaliacao_id, sintoma_id)
);

-- =============================================================================
-- 3.8 tb_historico_familiar — Histórico familiar (1:1 com tb_avaliacoes)
-- =============================================================================
CREATE TABLE tb_historico_familiar (
    id                          SERIAL    PRIMARY KEY,
    avaliacao_id                INTEGER   NOT NULL UNIQUE REFERENCES tb_avaliacoes(id) ON DELETE CASCADE,
    deficiencia_intelectual     BOOLEAN   DEFAULT FALSE,
    falencia_ovariana_precoce   BOOLEAN   DEFAULT FALSE,  -- FOP (pré-mutação FMR1)
    autismo_na_familia          BOOLEAN   DEFAULT FALSE,
    epilepsia                   BOOLEAN   DEFAULT FALSE,
    infertilidade_masculina     BOOLEAN   DEFAULT FALSE,
    menopausa_precoce           BOOLEAN   DEFAULT FALSE,  -- antes dos 40
    abortos_recorrentes         BOOLEAN   DEFAULT FALSE,
    tremor_ataxia_familiar      BOOLEAN   DEFAULT FALSE,  -- FXTAS (pré-mutação)
    descricao_outros            TEXT,
    criado_em                   TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 3.9 tb_encaminhamentos — Encaminhamentos terapêuticos sugeridos (RF06)
-- =============================================================================
CREATE TABLE tb_encaminhamentos (
    id                      SERIAL       PRIMARY KEY,
    avaliacao_id            INTEGER      NOT NULL REFERENCES tb_avaliacoes(id) ON DELETE CASCADE,
    tipo                    VARCHAR(60)  CHECK (tipo IN (
                                            'fonoaudiologia', 'psicologia', 'terapia_ocupacional',
                                            'psiquiatria', 'neuropediatria', 'genetica_medica',
                                            'exame_fmr1', 'fisioterapia', 'outro')),
    justificativa           TEXT,
    gerado_automaticamente  BOOLEAN      DEFAULT TRUE,
    criado_em               TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_encaminhamentos_avaliacao ON tb_encaminhamentos (avaliacao_id);

-- =============================================================================
-- 4. Tabelas de Log e Auditoria (LGPD / RNF04)
-- =============================================================================

-- 4.1 tb_log_sessoes — Ciclo de vida de cada sessão autenticada
CREATE TABLE tb_log_sessoes (
    id                  BIGSERIAL    PRIMARY KEY,
    usuario_id          INTEGER      REFERENCES usuarios(id),
    token_sessao_hash   TEXT,                            -- hash do JWT/cookie, nunca o token bruto
    ip_origem           INET,
    user_agent          TEXT,
    iniciada_em         TIMESTAMP    DEFAULT NOW(),
    encerrada_em        TIMESTAMP,
    tipo_encerramento   VARCHAR(20)  CHECK (tipo_encerramento IN ('logout', 'timeout', 'forcado', 'expirado')),
    duracao_segundos    INTEGER GENERATED ALWAYS AS (
                            EXTRACT(EPOCH FROM (encerrada_em - iniciada_em))::INTEGER
                        ) STORED
);

CREATE INDEX idx_log_sessoes_usuario ON tb_log_sessoes (usuario_id);

-- 4.2 tb_log_tentativas_login — Todas as tentativas de login (append-only)
CREATE TABLE tb_log_tentativas_login (
    id              BIGSERIAL    PRIMARY KEY,
    email_tentado   VARCHAR(255) NOT NULL,
    ip_origem       INET,
    user_agent      TEXT,
    sucesso         BOOLEAN      NOT NULL,
    motivo_falha    VARCHAR(60)  CHECK (motivo_falha IN (
                                    'senha_incorreta', 'usuario_inativo',
                                    'usuario_nao_encontrado', 'conta_bloqueada', 'token_invalido')),
    usuario_id      INTEGER      REFERENCES usuarios(id),
    sessao_id       BIGINT       REFERENCES tb_log_sessoes(id),
    tentado_em      TIMESTAMP    DEFAULT NOW()
);

-- Índice para detecção de brute force (mais de N falhas por IP numa janela)
CREATE INDEX idx_tentativas_ip_tempo ON tb_log_tentativas_login (ip_origem, tentado_em);

-- 4.3 tb_log_analises — Ciclo de vida de cada análise clínica
CREATE TABLE tb_log_analises (
    id                BIGSERIAL    PRIMARY KEY,
    avaliacao_id      INTEGER      NOT NULL REFERENCES tb_avaliacoes(id) ON DELETE CASCADE,
    usuario_id        INTEGER      REFERENCES usuarios(id),
    sessao_id         BIGINT       REFERENCES tb_log_sessoes(id),
    iniciada_em       TIMESTAMP    DEFAULT NOW(),
    finalizada_em     TIMESTAMP,
    status_final      VARCHAR(20)  CHECK (status_final IN ('concluida', 'cancelada', 'timeout', 'em_andamento')),
    duracao_segundos  INTEGER GENERATED ALWAYS AS (
                          EXTRACT(EPOCH FROM (finalizada_em - iniciada_em))::INTEGER
                      ) STORED,
    score_gerado      NUMERIC(5,4),                      -- score em claro, para auditoria
    recomendou_exame  BOOLEAN
);

CREATE INDEX idx_log_analises_avaliacao ON tb_log_analises (avaliacao_id);

-- 4.4 tb_auditoria — Trilha de auditoria geral e imutável (append-only)
CREATE TABLE tb_auditoria (
    id                BIGSERIAL    PRIMARY KEY,
    usuario_id        INTEGER      REFERENCES usuarios(id),
    sessao_id         BIGINT       REFERENCES tb_log_sessoes(id),
    -- Lista de ações extensível (a doc cita "etc."). Mantenha alinhada à regra de negócio.
    acao              VARCHAR(60)  CHECK (acao IN (
                                       'PACIENTE_CRIADO', 'PACIENTE_EDITADO', 'PACIENTE_DESATIVADO',
                                       'AVALIACAO_CRIADA', 'AVALIACAO_FINALIZADA', 'AVALIACAO_CANCELADA',
                                       'SCORE_CALCULADO', 'ENCAMINHAMENTO_CRIADO',
                                       'USUARIO_CRIADO', 'USUARIO_EDITADO', 'USUARIO_DESATIVADO',
                                       'LOGIN', 'LOGOUT', 'EXPORTACAO')),
    tabela_afetada    VARCHAR(80),
    registro_id       VARCHAR(100),
    dados_anteriores  JSONB,
    dados_novos       JSONB,
    ip_address        INET,
    criado_em         TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_auditoria_usuario ON tb_auditoria (usuario_id);
CREATE INDEX idx_auditoria_acao    ON tb_auditoria (acao);

-- =============================================================================
-- SEED — Catálogo dos 12 sintomas (Romero et al. 2025)
--   peso = masculino | peso_feminino = feminino (NULL se exclusivo_masculino)
-- =============================================================================
INSERT INTO sintomas (descricao, descricao_en, peso, peso_feminino, exclusivo_masculino) VALUES
    ('Deficiência intelectual',                'Intellectual disability',          0.32, 0.20, FALSE),
    ('Face alongada / orelhas salientes',      'Long face / prominent ears',       0.29, 0.09, FALSE),
    ('Macroorquidismo',                        'Macroorchidism',                   0.26, NULL, TRUE),
    ('Hipermobilidade articular',              'Joint hypermobility',              0.19, 0.04, FALSE),
    ('Dificuldades de aprendizagem',           'Learning difficulties',            0.18, 0.28, FALSE),
    ('Déficit de atenção',                     'Attention deficit',                0.17, 0.12, FALSE),
    ('Movimentos repetitivos (estereotipias)', 'Repetitive movements / stereotypies', 0.17, 0.05, FALSE),
    ('Atraso na fala',                         'Speech delay',                     0.14, 0.01, FALSE),
    ('Hiperatividade',                         'Hyperactivity',                    0.12, 0.04, FALSE),
    ('Evita contato visual',                   'Avoids eye contact',               0.06, 0.08, FALSE),
    ('Evita contato físico',                   'Avoids physical contact',          0.04, 0.07, FALSE),
    ('Agressividade',                          'Aggressiveness',                   0.01, 0.02, FALSE);

-- =============================================================================
-- SEED — Parâmetros de triagem por sexo (Romero et al. 2025)
-- =============================================================================
INSERT INTO parametro_triagem (sexo, limiar_score, auc, sensibilidade, versao, ativo, referencia) VALUES
    ('M', 0.56, 0.73, 0.95, 'ROMERO_2025_v1_M', TRUE,
     'Romero et al. (2025). Fragile X Syndrome in Brazil: Development and Validation of a Clinical Checklist for Population Screening. medRxiv doi: 10.1101/2025.10.21.25338500'),
    ('F', 0.55, 0.76, 0.95, 'ROMERO_2025_v1_F', TRUE,
     'Romero et al. (2025). Fragile X Syndrome in Brazil: Development and Validation of a Clinical Checklist for Population Screening. medRxiv doi: 10.1101/2025.10.21.25338500');

-- Fim da Parte 1.
