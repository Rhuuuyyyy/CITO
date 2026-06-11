---
title: Contrato de API (Endpoints)
tags:
  - referencia
  - api
  - contrato
---

# Contrato de API (Endpoints)

Referência rápida de **todos** os endpoints. Base URL: `http://localhost:8000/api/v1`. Docs
interativas: `http://localhost:8000/api/v1/docs` (Swagger) e `/redoc`. Health: `GET /health`.

> Todos os endpoints (exceto `login` e `health`) exigem **`Authorization: Bearer <JWT>`**. O contrato
> front↔back é travado por `scripts/check_contract.py` (rotas + payloads).

## Tabela completa

| Método | Rota | Auth | Front que consome | Fluxo |
|--------|------|:----:|-------------------|-------|
| POST | `/auth/login` (form-urlencoded) | — | Login.jsx | [[Fluxo - Login e Sessão]] |
| POST | `/auth/logout?sessao_id=` | (sessao_id) | App.jsx | [[Fluxo - Login e Sessão]] |
| GET | `/sintomas` | | Triagem.jsx | [[Aplicação - Use Cases e DTOs\|GetSymptoms]] |
| GET | `/pacientes?nome=&cpf=&limit=&offset=` | | Pacientes, Triagem, Agenda | [[Fluxo - Listagem de Pacientes]] |
| POST | `/pacientes` | | Pacientes, Triagem | [[Fluxo - Cadastro de Paciente]] |
| GET | `/pacientes/{id}` | | Pacientes (prontuário) | [[Fluxo - Listagem de Pacientes]] |
| GET | `/pacientes/{id}/historico` | | Pacientes | [[Fluxo - Dashboard e Histórico]] |
| POST | `/avaliacoes` | | Triagem.jsx | [[Fluxo - Submissão de Anamnese]] |
| GET | `/dashboard/summary` | | Dashboard.jsx | [[Fluxo - Dashboard e Histórico]] |
| GET | `/dashboard/stats?uf=&sexo=&etnia=` | | (analytics) | [[Fluxo - Dashboard e Histórico]] |
| POST | `/dashboard/refresh` | admin | (admin) | [[Fluxo - Dashboard e Histórico]] |
| GET | `/relatorios/avaliacoes` | | Config.jsx (Relatórios) | [[Cálculo de Score de Triagem]] |
| GET | `/agendamentos` | | Agenda.jsx | — |
| POST | `/agendamentos` | | Agenda.jsx | — |
| GET | `/acompanhantes` | | (seleção) | — |
| GET | `/health` | — | infra | [[Composition Root (main.py)]] |

## Respostas de erro (RFC 7807 Problem Details)

Erros de domínio são traduzidos por handlers centrais ([[Composition Root (main.py)]]). Corpo:
`{"type": <code>, "title": <título>, "detail": <mensagem>}`.

| HTTP | `type` | Quando |
|------|--------|--------|
| 401 | `auth.unauthenticated` | sem/JWT inválido (`get_current_doctor`) |
| 403 | `auth.forbidden` | role insuficiente (ex.: `/dashboard/refresh` sem admin) |
| 404 | `resource.not_found` | recurso inexistente (ex.: paciente de outro médico) |
| 409 | `resource.conflict` | recurso duplicado |
| 422 | `lgpd.violation` | k-anonimato violado (`/dashboard/stats`) |
| 422 | `domain.error` | regra de negócio violada |
| 422 | (Pydantic) | payload inválido (`extra="forbid"`, tipos) |
| 429 | — | brute-force no login |
| 502 | — | erro de banco no fluxo de anamnese |
| 500 | `cito.error` | erro interno (detalhe genérico) |

## Exemplos de payload

### `POST /auth/login` (form-urlencoded)
```
username=medico@hospital.com&password=senha-secreta
→ { "access_token": "...", "token_type": "Bearer", "sessao_id": 34, "usuario_id": 7 }
```

### `POST /pacientes`
Ver [[Fluxo - Cadastro de Paciente]] (schema `PatientCreateRequest`).

### `POST /avaliacoes`
Ver [[Fluxo - Submissão de Anamnese]] (schema `SubmitAnamnesisRequest`).

### `POST /agendamentos`
```json
{ "titulo": "Consulta", "tipo": "Triagem SXF",
  "data_hora": "2026-06-10T14:30:00", "status": "confirmado", "paciente_id": 1 }
```

## O guard de contrato (`scripts/check_contract.py`)

Script estático (roda **sem banco**) que valida:
1. **Rotas:** todo endpoint que o front chama existe no app FastAPI, com o método certo.
2. **Payloads:** exemplos representativos do front validam contra os schemas de request (com
   `extra="forbid"`, um campo renomeado/sobrando é detectado).

Exit 0 = contrato OK. Rode-o sempre que mexer em rotas/campos. Junto com `python -c "import app.main"`
forma a **rede de segurança** estática do projeto.

## Relacionados
- [[Apresentação - Routers, Schemas e Masking]] — os schemas por trás de cada rota.
- [[Composition Root (main.py)]] — onde as rotas são registradas e os erros traduzidos.
- [[Glossário]]
