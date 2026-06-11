---
title: Modelo de Dados (Banco)
tags:
  - dominio
  - banco
  - referencia
---

# Modelo de Dados (Banco)

Resumo navegável do banco PostgreSQL do CITO. A referência completa é `docs/database_report.md`; aqui
está o essencial para um(a) dev do back-end, com ênfase em **como as camadas físicas/lógicas se
relacionam** e nas **suposições** que o back-end faz.

> Veja o diagrama: [[Modelo de Dados.canvas| Modelo de Dados (Canvas)]]
> Banco: PostgreSQL 17.6 (Supabase) · Extensões: `pgcrypto`, `pg_trgm`.

## Princípio central: três camadas de dados

```
FÍSICA  (tb_*)   →  guarda dados CIFRADOS (BYTEA) e hashes      ← back NÃO acessa direto
   ▲ trigger INSTEAD OF cifra no INSERT
LÓGICA  (views)  →  decifram em runtime (pgp_sym_decrypt)        ← back acessa SÓ aqui
RELATÓRIO        →  vw_dashboard_anonimizado (sem PII)           ← BI / dashboard
```

> O back-end (role `nivel_1`) opera **exclusivamente pelas views**. É a tradução técnica da regra
> "o back não toca as tabelas físicas". Ver [[Conformidade LGPD]].

## Tabelas físicas principais (`tb_*` e afins)

| Tabela | Papel | PII? |
|--------|-------|------|
| `usuarios` | Médicos/admins (raiz de autoria); senha bcrypt por trigger | senha |
| `tb_pacientes` | Núcleo clínico/demográfico; `nome_criptografado` (BYTEA), `cpf_hash` | **sim** (cifrada) |
| `tb_acompanhantes` | Responsável/cuidador; mesmo padrão de proteção | **sim** (cifrada) |
| `tb_avaliacoes` | Sessões de triagem; `score_final`, `status` (rascunho/finalizada/cancelada) | não |
| `sintomas` | Catálogo de 12 sintomas com `peso`/`peso_feminino` | não |
| `parametro_triagem` | Limiares por sexo (`limiar_score`), AUC, versão | não |
| `respostas_checklist` | N:M avaliação×sintoma (PK composta); `presente` | não |
| `tb_historico_familiar` | Achados hereditários (1 por avaliação) | não |
| `tb_encaminhamentos` | Encaminhamentos (ex.: `exame_fmr1`); `gerado_automaticamente` | não |
| `tb_agendamentos` | Agenda de compromissos | não |

## Tabelas de log/auditoria (append-only)

| Tabela | Registra | Usada por |
|--------|----------|-----------|
| `tb_log_sessoes` | Sessões autenticadas; `id` = `sessao_id` do JWT | [[Fluxo - Login e Sessão]] |
| `tb_log_tentativas_login` | Toda tentativa de login (base anti-brute-force) | `AuthService` |
| `tb_log_analises` | Cada execução de score (score em claro p/ auditoria) | [[Cálculo de Score de Triagem]] |
| `tb_auditoria` | Trilha geral de mutações (JSONB antes/depois) | `AuditRepository` |

## Views (camada lógica) — o que o back enxerga

| View | Sobre | Leitura | Escrita |
|------|-------|---------|---------|
| `pacientes` | `tb_pacientes` + LEFT JOIN acompanhante | `nome` **decifrado**, `idade_anos` calculada, todos os campos | trigger `INSTEAD OF INSERT` (`fn_pacientes_insert`) cifra o nome |
| `acompanhantes` | `tb_acompanhantes` | `nome` decifrado | trigger `fn_acompanhantes_insert` cifra o nome |
| `avaliacoes` | `tb_avaliacoes` | + coluna calculada **`recomenda_exame`** | **somente leitura** (escrita vai direto em `tb_avaliacoes`) |
| `vw_dashboard_anonimizado` (materializada) | agregações | sem PII (sintoma/sexo/idade/etnia/UF) | refresh `CONCURRENTLY` (admin) |

> `recomenda_exame` na view `avaliacoes` é a **dependência crítica** do back ([[Decisões de Arquitetura (ADRs)|ADR-0005]]).
> Definição SQL em [[Cálculo de Score de Triagem]].

## Funções importantes (RPC e triggers)

| Função | Tipo | Papel |
|--------|------|-------|
| `fn_calcular_score_triagem(avaliacao_id)` | RPC | Calcula score, finaliza avaliação, loga. **Coração da triagem.** |
| `fn_registrar_auditoria(...)` | RPC | Grava em `tb_auditoria` (best-effort no back) |
| `fn_pacientes_insert()` / `fn_acompanhantes_insert()` | trigger | Cifram o nome no INSERT das views |
| `fn_hash_senha_usuario()` | trigger | bcrypt na senha do usuário |
| `fn_set_updated_at()` | trigger | mantém `atualizado_em` |

(Há também `fn_login`/`fn_logout` no banco, mas o back-end faz login via SQL direto no `AuthService`,
não por essas RPCs.)

## Criptografia — resumo

| Técnica | Onde | Para quê |
|---------|------|----------|
| PGP simétrico (AES-256, reversível) | `tb_pacientes.nome_criptografado`, `tb_acompanhantes.nome_criptografado` | nomes (precisam ser lidos de volta) |
| SHA-256 (hash, irreversível) | `cpf_hash`, `token_sessao_hash` | comparação por igualdade |
| bcrypt | `usuarios.senha` | autenticação |

## RBAC de banco

| Role | Permissões | Uso |
|------|-----------|-----|
| `nivel_1` | SELECT/INSERT/UPDATE nas **views** + EXECUTE nas funções | **API (back-end)** |
| `nivel_2` | SELECT em tabelas e views | Auditoria |
| `nivel_3` | SELECT nas views clínicas + `vw_dashboard_anonimizado` | BI/relatórios |

RLS habilitado nas tabelas, com políticas seguindo a segmentação acima.

## Suposições do back sobre o banco (validar no E2E)

O back assume comportamentos não verificáveis por `import` (do `SPEC.md`):
1. **(bloqueante)** view `avaliacoes` expõe `recomenda_exame`.
2. INSERT em `avaliacoes` sem `status`/`data_avaliacao` → precisa de **defaults** (`'rascunho'`, `now()`).
3. INSERT na view `pacientes` mapeia/cifra o nome e aceita as colunas demográficas; `ativo` default true.
4. Views expõem as colunas usadas em SELECT/JOIN (lista no SPEC).
5. **Grants** do `nivel_1` cobrem views + tabelas não-PII + EXECUTE nas funções.
6. `fn_registrar_auditoria` aceita os parâmetros nomeados `p_*`.
7. `fn_calcular_score_triagem` retorna a `TABLE(...)` e finaliza a avaliação.
8. (não-fatal) possível log duplicado em `tb_log_analises` — ver [[Fluxo - Submissão de Anamnese]].
9. `REFRESH ... CONCURRENTLY` exige índice único na view materializada.

## Scripts SQL versionados

- `scripts/sql/2026-06-09_p0_views.sql` — recria as views `pacientes` e `avaliacoes` (com
  `recomenda_exame`) e **trunca** os dados legados.
- `scripts/sql/2026-06-09_p1_write_triggers.sql` — view `acompanhantes` + triggers `INSTEAD OF INSERT`
  que cifram os nomes.

## Relacionados
- [[Conformidade LGPD]] — cifragem, chave por sessão, RBAC.
- [[Cálculo de Score de Triagem]] — `fn_calcular_score_triagem` e `recomenda_exame`.
- [[Interfaces - Repositórios e Dependências]] — quem faz as queries.
- [[Decisões de Arquitetura (ADRs)|ADR-0005]] — a dependência de `recomenda_exame`.
