# Plano de Integração — CITO (v2)

**Data:** 2026-06-08
**Para:** IA executora
**Status:** Pronto para execução

---

## Contexto

O sistema CITO é uma ferramenta de pré-diagnóstico da Síndrome do X Frágil (SXF) para médicos. Três grupos universitários construíram as camadas separadamente com baixa sincronia. O resultado:

- **Frontend** (`frontend/src/`): React/JSX, funcional visualmente, mas comunica-se diretamente com o Supabase via cliente JS — nunca passou pelo backend.
- **Backend** (`app/`): FastAPI com arquitetura hexagonal completa (ports & adapters, use cases, repositórios) — bem estruturado, nunca chamado por ninguém.
- **Banco** (Supabase/PostgreSQL): documentado em `docs/database_report.md` — leia esse arquivo inteiro antes de começar qualquer coisa.

**Objetivo único:** fazer o frontend se comunicar exclusivamente com o backend FastAPI. O backend já tem toda a estrutura necessária; precisa de correções e extensões pontuais.

---

## Como o banco funciona — leia antes de tocar em qualquer repositório

O banco foi projetado em camadas (detalhes completos em `docs/database_report.md`):

- **Tabelas físicas** (`tb_*`): armazenam dados cifrados — nunca devem ser acessadas diretamente pelo backend.
- **Views lógicas** (`pacientes`, `avaliacoes`, `acompanhantes`): interface do backend. Triggers `INSTEAD OF` aplicam `pgp_sym_encrypt`/`pgp_sym_decrypt` (AES-256) de forma completamente transparente. O backend escreve texto claro, a view cifra. O backend lê texto claro, a view decifra.
- **View de relatório** (`vw_dashboard_anonimizado`): agregados anônimos para BI. Colunas reais: `sintoma`, `sexo`, `idade_anos`, `etnia`, `uf_residencia`, `total_avaliacoes`, `total_presentes`, `prevalencia_pct`, `versao_parametro`.

A chave PGP é injetada por conexão via `SET app.pgp_key`. O backend já faz isso corretamente em `app/db/database.py`. Não mexa nisso.

---

## Decisões que precisam de confirmação antes de executar

Antes de começar, verifique os dois pontos abaixo diretamente no banco:

**1. Coluna `recomenda_exame` na view `avaliacoes`**
O backend consulta essa coluna em múltiplos repositórios. A tabela física `tb_avaliacoes` não a tem explicitamente. Verifique se a view a computa. Se não existir, a view precisa ser corrigida pelo grupo de banco — o backend não deve contornar isso com lógica de negócio duplicada.

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'avaliacoes' AND table_schema = 'public';
```

**2. Dados existentes de nomes estão em hex UTF-8, não PGP**
O frontend usava `encodeNome()` (hex de bytes UTF-8) — incompatível com `pgp_sym_encrypt`. Registros existentes no banco estão corrompidos para leitura via backend. Para um ambiente de desenvolvimento acadêmico, a solução mais limpa é apagar os dados de teste e começar do zero. Se houver razão para migrar, escreva um script de migração — não faça isso inline.

---

## O que precisa ser corrigido

### No backend

**Bug crítico de inicialização**
`app/core/config.py` tem um typo em `app_verison` que causa `AttributeError` quando `main.py` acessa `settings.app_version`. Corrija o nome do campo.

**Resposta de login incompleta**
`TokenLoginResponse` não retorna `usuario_id`. O frontend precisa dele para associar criações de pacientes e triagens ao médico autenticado. Adicione ao schema e ao retorno do endpoint.

**Histórico familiar não existe no backend**
A tabela `tb_historico_familiar` existe no banco e é preenchida pelo frontend durante a triagem. O backend não tem nenhuma representação disso — sem DTO, sem repositório, sem use case. É preciso criar tudo isso e integrá-lo ao `SubmitAnamnesisUseCase`, que deve persistir o histórico familiar como parte do mesmo fluxo de submissão de anamnese, antes do cálculo de score.

**`DashboardRepository.get_stats()` está quebrado**
O método consulta colunas que não existem em `vw_dashboard_anonimizado` (`faixa_etaria`, `media_score`, `taxa_recomendacao_exame`). Reescreva a query e o dataclass para usar as colunas reais da view, documentadas acima. Atualize o schema HTTP correspondente.

**`PatientListItemSchema` está incompleto**
O frontend precisa de: nome mascarado, CPF mascarado, telefone do acompanhante, último score, data da última avaliação e status de risco. O `PatientReadRepository` precisa de query enriquecida com JOINs nas views `acompanhantes` e `avaliacoes`. O schema deve refletir isso.

**`AcompanhanteCreateRequest` não tem `relacao`**
O frontend envia o grau de parentesco junto com os dados do acompanhante. O schema não prevê esse campo. Adicione-o e garanta que o use case o propague como `grau_parentesco` no `Patient`.

**Endpoint de sintomas ausente**
O frontend precisa buscar os IDs dos sintomas pelo nome para montar o payload de triagem. Crie um endpoint `GET /api/v1/sintomas` que retorne o catálogo da tabela `sintomas` com `ativo = TRUE`. Registre o router em `main.py`.

### No frontend

**Remover completamente o cliente Supabase**
`frontend/src/supabaseClient.js` e todas as funções `encodeNome`, `decodeNome`, `hashCpf` devem ser removidos. Toda comunicação de dados passa a ser via `fetch()` para o backend.

**Criar módulo centralizado de API**
Crie um único módulo (`frontend/src/api/client.js` ou equivalente) que gerencie a URL base, o token JWT em `sessionStorage`, os headers de autenticação e os métodos HTTP. Todo acesso à API deve passar por ele — nenhuma chamada `fetch()` direta espalhada nos componentes.

**Autenticação**
O endpoint de login do backend usa `application/x-www-form-urlencoded` com campos `username` e `password` (padrão OAuth2). O frontend deve adaptar o formulário de login para esse formato. Após login bem-sucedido, armazenar o token JWT e o objeto `{id: usuario_id, sessao_id}` para uso nos componentes.

**Migração de chamadas por página**

| Página / Componente | O que substituir | Endpoint do backend |
|---|---|---|
| `Login.jsx` | `db.rpc('fn_login', ...)` | `POST /api/v1/auth/login` |
| `Pacientes.jsx` — listagem | `db.from('tb_pacientes').select(...)` | `GET /api/v1/pacientes` |
| `Pacientes.jsx` — cadastro | inserts em `tb_acompanhantes` + `tb_pacientes` | `POST /api/v1/pacientes` |
| `Pacientes.jsx` — prontuário | `db.from('tb_avaliacoes').select(...)` | `GET /api/v1/pacientes/{id}/historico` |
| `Triagem.jsx` — lista de pacientes | `db.from('tb_pacientes').select(...)` | `GET /api/v1/pacientes` |
| `Triagem.jsx` — IDs de sintomas | `db.from('sintomas').select(...)` | `GET /api/v1/sintomas` |
| `Triagem.jsx` — salvar | inserts + `db.rpc('fn_calcular_score_triagem')` | `POST /api/v1/avaliacoes` |
| `Dashboard.jsx` — stats | queries diretas em `tb_avaliacoes` + `tb_pacientes` | `GET /api/v1/dashboard/summary` |

**Payload de triagem**
O endpoint `POST /api/v1/avaliacoes` deve receber em um único request: `paciente_id`, `sessao_id`, `observacoes`, `diagnostico_previo_fxs`, lista de respostas do checklist e o histórico familiar. O frontend deve montar esse payload completo antes de enviar.

---

## Invariantes a preservar

Estes comportamentos já funcionam corretamente e não devem ser alterados:

- Injeção da `pgp_key` por sessão em `get_db_session()` — não mover, não duplicar.
- Proteção contra força bruta em `AuthService.check_brute_force()`.
- Cálculo de score via `fn_calcular_score_triagem` chamada pelo `SymptomScoringOrchestrator` — a lógica de score permanece no banco.
- Hierarquia de exceções de domínio em `app/core/exceptions.py` e seus handlers em `main.py`.
- Arquitetura hexagonal: repositórios não conhecem HTTP, use cases não conhecem SQL.

---

## Ordem de execução recomendada

1. Leia `docs/database_report.md` na íntegra.
2. Confirme as duas decisões da seção "Decisões que precisam de confirmação".
3. Corrija o backend na ordem: typo → login response → histórico familiar → dashboard → patient list → acompanhante → endpoint sintomas.
4. Migre o frontend na ordem: módulo de API → login → pacientes → triagem → dashboard.
5. Configure o `.env` com `DATABASE_URL` (postgresql+asyncpg), `SECRET_KEY`, `PGP_KEY` e `CORS_ORIGINS`.
6. Suba o backend e valide cada endpoint via Swagger (`/api/v1/docs`) antes de testar o frontend.
7. Teste os fluxos E2E: login → dashboard → novo paciente → triagem completa → prontuário → logout.

---

## Após terminar todas as correções acima

Faça uma revisão completa de todo o código do projeto — frontend e backend — em busca de:

- Inconsistências entre schemas HTTP e DTOs de aplicação
- Campos que o frontend envia mas o backend silenciosamente ignora
- Queries SQL que podem falhar em runtime por colunas ou tabelas inexistentes
- Tratamento de erros ausente ou genérico demais (especialmente no frontend)
- Dados sensíveis que possam vazar em logs ou respostas de erro
- Código morto deixado pela migração (imports do Supabase, funções `encode/decode`, etc.)
- Qualquer violação da separação de camadas da arquitetura hexagonal
- Oportunidades óbvias de simplificação que não alteram o comportamento

Corrija tudo que encontrar. Não documente os problemas — resolva-os.
