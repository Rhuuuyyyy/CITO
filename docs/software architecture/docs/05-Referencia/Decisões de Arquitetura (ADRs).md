---
title: Decisões de Arquitetura (ADRs)
tags:
  - referencia
  - adr
  - decisao
---

# Decisões de Arquitetura (ADRs)

Espelho navegável dos **Architecture Decision Records** do projeto. Os originais (imutáveis) vivem em
`docs/adr/` no repositório — esta página os resume e interliga ao resto do cofre.

> **Pano de fundo comum:** projeto universitário com três grupos (Front, Back, Banco) em ritmos
> diferentes. Front e Banco estavam alinhados; o Back era uma versão antiga e desconectada. A
> integração fez o front falar **só** com o back e atualizou o back ao esquema real — origem de várias
> decisões abaixo e do [[Núcleo Ativo vs Scaffolding Legado|código legado remanescente]].

## Índice

| # | Decisão | Status | Documento relacionado |
|---|---------|--------|-----------------------|
| 0001 | Front fala **exclusivamente** com a API (fim do Supabase direto) | Aceito | [[Visão Geral da Arquitetura]] |
| 0002 | PII **mascarada** na borda da API | Aceito | [[Conformidade LGPD]] |
| 0003 | Identidade **inteira (SERIAL)** em vez de UUID | Aceito | [[Núcleo Ativo vs Scaffolding Legado]] |
| 0004 | Submissão de avaliação **consolidada** num endpoint | Aceito | [[Fluxo - Submissão de Anamnese]] |
| 0005 | Dependência da view expor `recomenda_exame` | Aceito | [[Cálculo de Score de Triagem]] |

---

## ADR-0001 — Front fala exclusivamente com a API

**Contexto:** o front (React via CDN) acessava o **Supabase direto** no navegador, expondo a `anon
key` e o esquema, e **reimplementando** regra de negócio (score, limiar, encaminhamento) que divergia
do back.

**Decisão:** o front passa a falar **só** com a API FastAPI (`/api/v1/...`). Todo acesso ao banco é no
servidor. Criado um **módulo único de rede** (`frontend/src/api/client.js`); nenhum componente chama
`fetch()` direto. Removidos `@supabase/supabase-js`, `supabaseClient.js` e helpers de cifragem do
front.

**Consequências:** uma fonte de verdade para a regra; segredos e esquema deixam de vazar; contrato
estável (schemas Pydantic). o back precisa de **CORS**; foi preciso **criar endpoints** faltantes
(`/sintomas`, `/agendamentos`, `/relatorios`); o front depende do back no ar.

Relacionado: [[Visão Geral da Arquitetura]], ADR-0004.

---

## ADR-0002 — PII mascarada na borda da API

**Contexto:** o banco cifra PII e expõe views que decifram. Com tudo passando agora pela API, surge a
pergunta: a API deve devolver nome/CPF em claro?

**Decisão:** **não**. A API mascara PII na borda. `mask_name()` mostra o primeiro nome e mascara o
resto (`"Maria A*** S***"`); CPF vira `CPF_MASK = "***.***.***-**"` (só o hash existe no banco);
respostas usam `nome_masked`/`cpf_masked`.

**Consequências:** LGPD por padrão; menos exposição em cliente/logs. o front **nunca** tem o nome
em claro de paciente existente (laudo de paciente já cadastrado sai mascarado; no cadastro novo o nome
ainda está na memória do form); **busca por nome é server-side** (`?nome=...` com debounce).

Relacionado: [[Conformidade LGPD]], [[Fluxo - Listagem de Pacientes]].

---

## ADR-0003 — Identidade inteira (SERIAL) em vez de UUID

**Contexto:** o back antigo modelava `Patient`/`Acompanhante` com **UUID** e gerava o id na aplicação.
O banco real usa **`SERIAL`/`INTEGER`** auto-incrementado; views/triggers assumem inteiros. Inserir
UUID em PK inteiro quebraria o cadastro — bloqueador silencioso.

**Decisão:** identidade **inteira** ponta a ponta. Entidades com `id: int | None = None`; INSERT sem
id, com `RETURNING id`; o id volta e é fixado via `model_copy`. `acompanhante_id` é `int`.

**Consequências:** cadastro funciona contra o esquema real; menos código. ids são **enumeráveis**
→ risco de **IDOR**, mitigado porque toda rota exige JWT e **filtra por `usuario_id`** do médico dono
(regra obrigatória em qualquer rota nova).

> Esta decisão é a razão de o **scaffolding UUID** ter ficado órfão — ver
> [[Núcleo Ativo vs Scaffolding Legado]].

---

## ADR-0004 — Submissão de avaliação consolidada num endpoint

**Contexto:** finalizar uma triagem exigia **7 operações** sequenciais no navegador (inserts +
RPC de score + auditoria), com regra no cliente e **sem atomicidade**.

**Decisão:** consolidar tudo em `POST /api/v1/avaliacoes`. O front envia **um** payload; o
`SubmitAnamnesisUseCase` executa o fluxo completo (rascunho → respostas → histórico → score → encaminha
→ audita). O cadastro de paciente novo é uma chamada anterior separada.

**Decisões finas:** auditoria é **best-effort** (SAVEPOINT + try/except); histórico e encaminhamento
são **fatais**; `respostas` exige `min_length=1`; o front ainda calcula score local só para **preview**.

Relacionado: [[Fluxo - Submissão de Anamnese]], ADR-0005.

---

## ADR-0005 — Dependência da view expor `recomenda_exame`

**Contexto:** dashboard (`taxa_recomendacao_exame`), histórico e lista enriquecida precisam saber se
uma avaliação **recomenda exame**. A regra (`score >= limiar(sexo)`, suprimida por diagnóstico prévio)
vive no banco.

**Decisão:** o back **lê `recomenda_exame` da view `avaliacoes`** em vez de recomputar em Python.
Logo, **a view precisa expor a coluna `recomenda_exame` (BOOLEAN)** — dependência explícita do grupo de
Banco. Exceção: `/relatorios/avaliacoes` **não** depende dela (devolve `score`+`sexo`; o front computa).

**Consequências:** sem duplicação da regra; banco é a fonte de verdade. se a view não tiver a
coluna, dashboard/histórico **falham em runtime** (não no import test) — item nº 1 da checklist E2E.

Relacionado: [[Cálculo de Score de Triagem]], [[Modelo de Dados (Banco)]], ADR-0004.

---

## Como escrever um novo ADR

Formato: um arquivo numerado em `docs/adr/` com **Contexto → Decisão → Consequências → Alternativas**.
ADRs são **imutáveis** após aceitos; mudou de ideia? escreva um novo que substitui o anterior
(`Status: Substituído por NNNN`). Depois, espelhe-o aqui e interligue com os documentos afetados.

## Relacionados
- [[Início]] · [[Visão Geral da Arquitetura]] · [[Núcleo Ativo vs Scaffolding Legado]]
