-- =============================================================================
-- Sistema SXF — Síndrome do X Frágil (Apoio ao Diagnóstico)
-- Parte 3 de 3 — Roles e permissões (RBAC) — princípio do menor privilégio
--
-- OPCIONAL no Supabase: lá o controle de acesso pode ser feito via
-- Row Level Security (RLS) nativo. Use este script em um Postgres próprio
-- ou quando quiser roles de banco explícitos.
--
-- Roles:
--   nivel_1 (API Web)    -> escreve nas views e nos logs; executa as funções
--   nivel_2 (Auditoria)  -> SELECT em tudo, sem modificar nada
--   nivel_3 (BI/Analytics)-> SELECT só nas views clínicas + dashboard
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Criação idempotente dos roles
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nivel_1') THEN
        CREATE ROLE nivel_1 NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nivel_2') THEN
        CREATE ROLE nivel_2 NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nivel_3') THEN
        CREATE ROLE nivel_3 NOLOGIN;
    END IF;
END $$;

-- Acesso ao schema
GRANT USAGE ON SCHEMA public TO nivel_1, nivel_2, nivel_3;

-- =============================================================================
-- nivel_1 — API Web
--   Escreve via views (criptografia transparente) e nas tabelas de log/histórico.
--   NÃO acessa diretamente tb_pacientes / tb_avaliacoes / tb_acompanhantes.
-- =============================================================================
GRANT SELECT, INSERT, UPDATE ON pacientes, acompanhantes, avaliacoes TO nivel_1;

GRANT SELECT, INSERT, UPDATE ON
    respostas_checklist,
    tb_historico_familiar,
    tb_encaminhamentos,
    tb_log_sessoes,
    tb_log_analises
TO nivel_1;

-- Logs append-only: somente INSERT (UPDATE/DELETE revogados mais abaixo)
GRANT SELECT, INSERT ON tb_log_tentativas_login, tb_auditoria TO nivel_1;

-- Catálogos de leitura para o cálculo
GRANT SELECT ON sintomas, parametro_triagem TO nivel_1;

-- Tabela de usuários: a API precisa autenticar e atualizar ultimo_acesso
GRANT SELECT, INSERT, UPDATE ON usuarios TO nivel_1;

-- Sequences (necessárias para INSERT com SERIAL/BIGSERIAL)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nivel_1;

-- EXECUTE nas funções principais
GRANT EXECUTE ON FUNCTION fn_calcular_score_triagem(INTEGER) TO nivel_1;
GRANT EXECUTE ON FUNCTION fn_registrar_auditoria(INTEGER, BIGINT, VARCHAR, VARCHAR, VARCHAR, JSONB, JSONB) TO nivel_1;

-- =============================================================================
-- nivel_2 — Auditoria — SELECT em absolutamente tudo, sem modificar
-- =============================================================================
GRANT SELECT ON ALL TABLES IN SCHEMA public TO nivel_2;

-- =============================================================================
-- nivel_3 — BI/Analytics — SELECT só nas views clínicas + dashboard
--   NÃO acessa usuarios, logs de sessão, tentativas de login nem tb_auditoria.
-- =============================================================================
GRANT SELECT ON pacientes, avaliacoes, acompanhantes, vw_dashboard_anonimizado TO nivel_3;

-- =============================================================================
-- Integridade dos logs append-only
--   tb_auditoria e tb_log_tentativas_login: UPDATE/DELETE/TRUNCATE revogados
--   de TODOS os roles (PUBLIC e os três níveis).
-- =============================================================================
REVOKE UPDATE, DELETE, TRUNCATE ON tb_auditoria              FROM PUBLIC, nivel_1, nivel_2, nivel_3;
REVOKE UPDATE, DELETE, TRUNCATE ON tb_log_tentativas_login   FROM PUBLIC, nivel_1, nivel_2, nivel_3;

-- =============================================================================
-- NOTA — Erro "role cannot be dropped because some objects depend on it"
-- Se precisar recriar os roles, rode antes (ver seção 12.4 da documentação):
--
--   REVOKE ALL PRIVILEGES ON DATABASE postgres FROM nivel_1, nivel_2, nivel_3;
--   REVOKE ALL PRIVILEGES ON SCHEMA public      FROM nivel_1, nivel_2, nivel_3;
--   REVOKE ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public FROM nivel_1, nivel_2, nivel_3;
--   REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM nivel_1, nivel_2, nivel_3;
--   DROP ROLE IF EXISTS nivel_1; DROP ROLE IF EXISTS nivel_2; DROP ROLE IF EXISTS nivel_3;
-- =============================================================================

-- Fim da Parte 3.
