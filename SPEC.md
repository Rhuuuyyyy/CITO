# SPEC — Integração CITO (Front ↔ Back ↔ Banco)

**Data:** 2026-06-08 · **Status:** aprovado (via charter) · **Base:** `integration_plan_v2.md` (raiz do workbench)

> Este documento é a fonte da verdade da integração. Ele **verifica** o plano original contra o
> código real e registra as decisões tomadas. Onde diverge do plano, esta SPEC prevalece.

## Objetivo
Fazer o frontend React falar **exclusivamente** com o backend FastAPI (hexagonal), eliminando o
acesso direto ao Supabase. O backend lê/escreve no banco apenas pelas **views** lógicas
(`pacientes`, `acompanhantes`, `avaliacoes`, …), que cifram/decifram via triggers `INSTEAD OF`.

## Critérios de sucesso (Definition of Done)
> Status: tudo **implementado e verificado estaticamente** (import test + `scripts/check_contract.py`
> + sweep do front). Os itens só marcam `[x]` quando confirmados; os que dependem de runtime ficam
> `[ ]` até o **E2E** do usuário (sem `.env`/banco nesta fase).
- [x] Backend importa e sobe sem erro (`python -c "import app.main"` verde).
- [ ] `POST /auth/login` retorna `usuario_id`; `POST /auth/logout` encerra sessão. *(estático ✓; E2E pendente)*
- [ ] `GET /sintomas` retorna catálogo ativo (id + descrição).
- [ ] `GET /pacientes` retorna lista enriquecida (nome mascarado, CPF mascarado, telefone do
      acompanhante, último score, data da última avaliação, status de risco).
- [ ] `POST /pacientes` aceita `acompanhante.relacao` (→ `grau_parentesco`) e não exige campos
      que o frontend não coleta.
- [ ] `POST /avaliacoes` persiste histórico familiar + respostas + score + encaminhamento (quando
      recomendado) em um único fluxo.
- [ ] `GET /pacientes/{id}/historico`, `GET /dashboard/summary`, `GET /dashboard/stats` corretos.
- [ ] `GET /agendamentos` + `POST /agendamentos` (Agenda).
- [ ] `GET /relatorios/avaliacoes` (Config → Relatórios).
- [x] Frontend: zero `@supabase/supabase-js`, zero `supabaseClient.js`, zero `fetch()` direto fora
      do módulo central `src/api/client.js`. *(sweep CLEAN)*
- [ ] Fluxo E2E: login → dashboard → novo paciente → triagem completa → prontuário → logout.

## Verificação do plano vs. código (o que mudou em relação ao `integration_plan_v2.md`)

### Confirmado pelo plano (todos reais)
typo `app_verison` (config.py:20) · `usuario_id` ausente em `TokenLoginResponse` ·
`DashboardRepository.get_stats` consulta colunas inexistentes · `PatientListItemSchema` incompleto ·
`AcompanhanteCreateRequest` sem `relacao` · histórico familiar inexistente no backend ·
endpoint `/sintomas` ausente.

> Nota: o router de dashboard/histórico **existe** (em `presentation/api/v1/routers/history.py`).
> O plano sugeria que faltava — não falta. Só `get_stats` estava com colunas erradas.

### Bloqueadores adicionais encontrados (não estavam no plano)
1. **UUID × SERIAL:** `patient_repository`/`acompanhante_repository` inseriam/liam coluna `uuid`
   inexistente (tabelas usam `id SERIAL`). **Decisão:** identidade das entidades passa a ser o
   `id` inteiro do banco; UUID removido. Alinha com o frontend (que sempre usou ids inteiros).
2. **`PatientCreateRequest` exigia `uf_nascimento`/`municipio_residencia`/`uf_residencia`** que o
   formulário não coleta. **Decisão:** campos opcionais (banco permite NULL).
3. **`AcompanhanteCreateRequest` exigia `telefone`/`email`** que a triagem pode deixar vazios.
   **Decisão:** opcionais; só `nome` e `relacao` obrigatórios.
4. **Supabase usado além do previsto:** `App.jsx` (logout), `Agenda.jsx` (agendamentos),
   `Config.jsx`/Relatórios. **Decisão:** migrar tudo; criar endpoints de agendamentos e relatórios.
5. **Triagem criava `tb_encaminhamentos` e auditoria** que o backend não fazia. **Decisão:**
   `SubmitAnamnesisUseCase` passa a criar o encaminhamento (quando `recomenda_exame`) e registrar
   auditoria (`PACIENTE_CRIADO`, `AVALIACAO_FINALIZADA`), preservando o comportamento atual.

## ⚠️ Dependência do grupo de Banco (Decisão #1 do plano)
A view **`avaliacoes` precisa expor a coluna `recomenda_exame`** (BOOLEAN). O backend a consulta em
`DashboardRepository.get_summary`, `AvaliacaoReadRepository.list_by_paciente` e na lista enriquecida
de pacientes. Conforme o plano, **o backend não duplica a regra de limiar** — a view deve computar
`recomenda_exame` (ex.: `score_final >= limiar_score` do `parametro_triagem` para o sexo). Se a
coluna não existir, esses 3 pontos falham em runtime e o grupo de banco deve corrigir a view.
(Sem acesso ao banco nesta sessão, não foi possível confirmar; documentado aqui.)

## ⚠️ Suposições sobre o banco (achadas no review de SQL — validar no E2E)
Cross-check dos repositórios contra `docs/database_report.md`. O código está **consistente com o
esquema documentado**; os itens abaixo dependem do comportamento dos **triggers/grants** (não
verificáveis sem o banco). Em ordem de risco:

1. **(BLOQUEANTE)** view `avaliacoes` expõe `recomenda_exame` — ver seção acima (ADR-0005).
2. **INSERT na view `avaliacoes` sem `status`** (`avaliacao_repository.create_rascunho`): a coluna
   `tb_avaliacoes.status` é NOT NULL. O trigger `fn_avaliacoes_dml` precisa **default `'rascunho'`**
   (e `data_avaliacao` precisa de default `now()`), senão a triagem falha no INSERT.
3. **INSERT na view `pacientes`** precisa: mapear `nome`→`nome_criptografado` (cifrar), aceitar as
   colunas demográficas enviadas (etnia, uf_*, prematuro, escolaridade, comorbidades, `acompanhante_id`,
   `grau_parentesco`, `diagnostico_confirmado_fxs`, `criado_por`) e **default `ativo=true`**.
4. **Leitura das views** precisa expor as colunas usadas em SELECT/JOIN:
   `pacientes` → `id, nome, cpf_hash, sexo, data_nascimento, acompanhante_id, criado_por`;
   `acompanhantes` → `id, nome, cpf_hash, telefone, email`;
   `avaliacoes` → `id, paciente_id, usuario_id, data_avaliacao, score_final, status, recomenda_exame`.
5. **Grants do usuário do `DATABASE_URL`:** além das views (pacientes/acompanhantes/avaliacoes),
   precisa de INSERT/SELECT direto nas tabelas não-PII: `respostas_checklist`,
   `tb_historico_familiar`, `tb_encaminhamentos`, `tb_agendamentos`, `tb_log_analises`; SELECT em
   `sintomas` e `vw_dashboard_anonimizado`; EXECUTE em `fn_calcular_score_triagem` e
   `fn_registrar_auditoria`. (Se for o owner/superuser do Supabase, já cobre.)
6. `fn_registrar_auditoria` aceita os parâmetros nomeados `p_usuario_id, p_sessao_id, p_acao,
   p_tabela, p_registro_id` (de todo modo é best-effort — falha não derruba o fluxo).
7. `fn_calcular_score_triagem(avaliacao_id)` retorna `TABLE(score_final, limiar_usado,
   recomenda_exame, versao_param)` e finaliza a avaliação (`status → 'finalizada'`).
8. **Não-fatal:** `open_log_analise` insere em `tb_log_analises` e a `fn_calcular_score_triagem`
   também "registra a análise nos logs" — pode gerar linha duplicada em `tb_log_analises` (auditoria,
   não quebra o fluxo). Verificar e, se incomodar, remover o `open_log_analise` do use case.
9. **Admin/`/dashboard/refresh`:** `REFRESH MATERIALIZED VIEW CONCURRENTLY` exige índice único na
   `vw_dashboard_anonimizado` (não afeta o fluxo do front; endpoint só para admin).

> Nada disso é editável com segurança sem ver os triggers/grants ou rodar o banco — por isso fica
> como checklist de E2E em vez de "correção às cegas".

## Contrato de endpoints (resumo)
| Método | Rota | Frontend que consome |
|--------|------|----------------------|
| POST | `/api/v1/auth/login` (form-urlencoded) | Login.jsx |
| POST | `/api/v1/auth/logout?sessao_id=` | App.jsx |
| GET  | `/api/v1/sintomas` | Triagem.jsx |
| GET  | `/api/v1/pacientes` (q: nome, cpf, limit, offset) | Pacientes.jsx, Triagem.jsx, Agenda.jsx |
| POST | `/api/v1/pacientes` | Pacientes.jsx, Triagem.jsx |
| GET  | `/api/v1/pacientes/{id}/historico` | Pacientes.jsx (prontuário) |
| POST | `/api/v1/avaliacoes` | Triagem.jsx |
| GET  | `/api/v1/dashboard/summary` | Dashboard.jsx |
| GET  | `/api/v1/relatorios/avaliacoes` | Config.jsx (Relatórios) |
| GET/POST | `/api/v1/agendamentos` | Agenda.jsx |

## Invariantes preservados
Injeção da `pgp_key` por sessão · brute-force em `AuthService` · score via
`fn_calcular_score_triagem` (lógica no banco) · hierarquia de exceções e handlers · arquitetura
hexagonal (repos sem HTTP, use cases sem SQL) · acesso só pelas views.

## Rede de segurança (sem banco nesta sessão)
`.venv/bin/python -c "import app.main"` (importa tudo + cria o app; asyncpg conecta lazy).
Baseline antes das mudanças: **RED** (typo). Meta: **GREEN** e assim permanecer a cada passo.
Verificação E2E real fica para quando houver `.env`/banco (responsabilidade do usuário).

## Limpeza dos dados legados
Nomes antigos gravados em hex UTF-8 (via `encodeNome`) são incompatíveis com `pgp_sym_encrypt`.
Decisão do usuário: **apagar os dados de teste** (ambiente acadêmico), sem script de migração.
