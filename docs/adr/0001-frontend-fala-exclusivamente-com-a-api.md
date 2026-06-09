# 0001 — Front-end fala exclusivamente com a API FastAPI

- **Status:** Aceito
- **Data:** 2026-06-08
- **Decisores:** dono do projeto (gate do Charter) + engenharia de integração

## Contexto

O Front-End (React via CDN, sem bundler) acessava o **Supabase diretamente** no navegador:
`db.from('tb_pacientes')...`, `db.rpc('fn_login'...)`, etc. Isso significava:

- A `anon key` do Supabase e o esquema do banco ficavam expostos no cliente.
- Regras de negócio (cálculo de score, limiar por sexo, encaminhamento, auditoria) eram
  **reimplementadas no front**, divergindo do Back-End.
- O Back-End FastAPI (arquitetura hexagonal) existia, mas era uma versão antiga, ignorada pelo front.
- Três grupos editavam camadas diferentes sem um contrato único.

## Decisão

O front-end passa a se comunicar **exclusivamente** com a API FastAPI (`/api/v1/...`). Todo acesso
ao banco acontece **no servidor**. Concretamente:

- Criado um **módulo único de rede** em `frontend/src/api/client.js` (objeto global `api`): sessão
  JWT em `sessionStorage`, header `Authorization: Bearer`, e helpers de domínio
  (`getPacientes`, `createPaciente`, `createAvaliacao`, `getDashboardSummary`, …).
- **Nenhum componente** chama `fetch()` diretamente — só o `api` faz.
- Removidos do projeto: o CDN `@supabase/supabase-js`, o `src/supabaseClient.js` e os helpers
  `encodeNome`/`decodeNome`/`hashCpf` (a cifragem/hash agora é responsabilidade do servidor).
- `API_BASE = window.CITO_API_BASE || 'http://localhost:8000/api/v1'` — configurável sem rebuild.

## Consequências

**Positivas**
- Uma única fonte de verdade para regra de negócio (o back).
- Esquema do banco e segredos deixam de vazar para o cliente.
- Contrato estável entre os grupos (schemas Pydantic = contrato).

**Negativas / custos**
- O back precisa habilitar **CORS** para a origem do front (`CORS_ORIGINS`).
- Foi necessário **criar endpoints** que faltavam (`/sintomas`, `/agendamentos`, `/relatorios`).
- O front depende do back estar no ar (não há mais fallback direto ao banco).

## Alternativas consideradas

- **Migração parcial** (núcleo clínico via API, Agenda/Config continuam no Supabase): rejeitada —
  manteria o CDN e o cliente Supabase carregados, violando o objetivo "zero Supabase no front".
- **Manter Supabase e só corrigir o back:** rejeitada — não resolve a duplicação de regra de
  negócio nem a exposição de segredos.

## Verificação

`grep -rn "supabase\|db\.\|\.rpc(\|fetch(" frontend/src` retorna **zero** ocorrências fora de
`frontend/src/api/client.js`. Veja também [[0004]] (submissão consolidada) e [[0002]] (mascaramento).
