---
title: As Quatro Camadas
tags:
  - camada/arquitetura
  - estrutura
---

# As Quatro Camadas

O back-end (`app/`) está dividido em quatro camadas lógicas. A **regra de dependência** é a mesma da
[[Arquitetura Hexagonal (Ports & Adapters)|arquitetura hexagonal]]: as setas de dependência apontam
para o **domínio** (centro). Código de fora pode depender de dentro; nunca o contrário.

```
presentation ──► application ──► domain ◄── interfaces
     │                │                         ▲
     └────────────────┴── tudo costurado em ────┘
                          app/main.py (composition root)
```

> A pasta `app/` tem dois grupos de diretórios por razões históricas (o projeto fundiu um back-end
> antigo com o novo). Os diretórios **`presentation/` e `application/`** são o caminho ativo; os
> diretórios `core/`, `db/`, `domain/`, `interfaces/`, `services/` complementam. Há também pastas
> vazias herdadas (`app/presentation/middlewares/`). Detalhe em [[Núcleo Ativo vs Scaffolding Legado]].

---

## 1 `presentation/` — a borda HTTP

**Responsabilidade:** falar HTTP. Receber requisições, validar payloads, chamar o caso de uso certo,
formatar a resposta e **mascarar PII**. É a única camada que conhece `fastapi`.

```
presentation/api/v1/
├── routers/          ← endpoints (auth, patients, anamnesis, history, …)
├── schemas/          ← contratos Pydantic (request/response) com extra="forbid"
└── masking.py        ← mask_name() e CPF_MASK (LGPD na borda)
```

- Cada **router** monta seu(s) caso(s) de uso manualmente (factory pattern) injetando os
  repositórios concretos com a `AsyncSession` da requisição.
- Os **schemas** são o **contrato** com o front: `extra="forbid"` faz qualquer campo inesperado
  falhar a validação (pega divergências de contrato cedo).
- Detalhes: [[Apresentação - Routers, Schemas e Masking]].

## 2 `application/` — os casos de uso

**Responsabilidade:** orquestrar a regra de negócio. Cada caso de uso é uma classe com um método
`execute()`. **HTTP-blind** (lança exceções de domínio, nunca `HTTPException`) e, em sua maioria,
**SQL-blind** (delega aos repositórios).

```
application/
├── use_cases/        ← 13 casos de uso (1 por operação de negócio)
└── dtos/             ← DTOs que desacoplam o use case dos schemas HTTP
```

Exemplos: `RegisterPatientUseCase`, `SubmitAnamnesisUseCase`, `GetDashboardStatsUseCase`
(este aplica o guard de [[Conformidade LGPD|k-anonimato]]). Detalhes:
[[Aplicação - Use Cases e DTOs]].

## 3 `domain/` — o núcleo puro

**Responsabilidade:** representar conceitos e invariantes do negócio, **sem nenhuma dependência de
infraestrutura** (sem FastAPI, sem SQLAlchemy, sem I/O).

```
domain/
├── entities/         ← Patient, Acompanhante (ATIVAS) + Evaluation, User… (LEGADO)
├── value_objects/    ← CPF (hash one-way, nunca logado)
├── services/         ← SymptomScoringOrchestrator (delega score ao banco)
└── ports/            ← Protocols I*Repository (LEGADO / não wired)
```

- As entidades **ativas** são `Patient` e `Acompanhante` (usadas no [[Fluxo - Cadastro de Paciente]]).
- O value object `CPF` garante validação e que o número **nunca** apareça em log/repr.
- Os `ports/` e várias entidades são scaffolding — ver [[Núcleo Ativo vs Scaffolding Legado]].
- Detalhes: [[Domínio - Entidades e Value Objects]].

## 4 `interfaces/` — os adapters de saída

**Responsabilidade:** implementar a persistência. Aqui mora o **SQL bruto** (via SQLAlchemy `text()`)
contra as **views** do banco.

```
interfaces/
├── repositories/     ← adapters concretos (PatientRepository, AvaliacaoRepository, …)
└── api/dependencies.py  ← get_current_doctor() — valida o JWT e devolve a identidade
```

> Nota de nomenclatura: numa hexagonal "de manual", os _ports_ (interfaces) ficariam no domínio e os
> _adapters_ aqui. No CITO, os use cases dependem **diretamente das classes concretas** de
> `interfaces/repositories/` (não dos Protocols de `domain/ports/`). Isso é pragmático e funciona,
> mas significa que os Protocols em `domain/ports/` estão **órfãos**. Ver
> [[Núcleo Ativo vs Scaffolding Legado]].

Detalhes: [[Interfaces - Repositórios e Dependências]].

---

## Camadas de apoio (transversais)

| Pasta | Papel | Documento |
|-------|-------|-----------|
| `core/` | Configuração tipada (`config.py`), JWT (`security.py`), hierarquia de exceções (`exceptions.py`) | [[Core - Configuração, Segurança e Exceções]] |
| `db/` | Engine async, _session factory_, injeção da `pgp_key` por sessão (`database.py`) | [[Core - Configuração, Segurança e Exceções]] |
| `services/` | `AuthService` — sessões e auditoria de login direto no banco | [[Fluxo - Login e Sessão]] |

## Tabela-resumo das regras de dependência

| Camada | **PODE** importar de | **NÃO PODE** importar de |
|--------|----------------------|--------------------------|
| `presentation` | application, interfaces, domain, core, db | — |
| `application` | domain, interfaces (adapters), core | presentation, fastapi |
| `domain` | (nada do projeto, só stdlib + pydantic) | presentation, application, interfaces, sqlalchemy, fastapi |
| `interfaces` | domain, application (DTOs), core, db | presentation, fastapi (exceto `dependencies.py`) |

> O único arquivo autorizado a importar de **todas** as camadas é o
> [[Composition Root (main.py)|composition root]] (`app/main.py`).
