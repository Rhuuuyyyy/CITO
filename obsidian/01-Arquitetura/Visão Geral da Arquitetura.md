---
title: Visão Geral da Arquitetura
tags:
  - camada/arquitetura
  - visao-geral
---

# Visão Geral da Arquitetura

O CITO é um sistema **3-tier** (três camadas físicas) cujo back-end segue, internamente, a
**arquitetura hexagonal** (ports & adapters). Este documento dá o mapa mental completo; aprofunde
depois em [[As Quatro Camadas]] e [[Arquitetura Hexagonal (Ports & Adapters)]].

## As três camadas físicas (deployment)

```
┌─────────────────────────────────────────────────────────────┐
│  FRONT-END  (React via CDN, sem bundler)                     │
│  Páginas: Login, Dashboard, Pacientes, Triagem, Agenda, Config│
│  Fala SÓ via frontend/src/api/client.js  (Bearer JWT)        │
└───────────────────────────┬─────────────────────────────────┘
                            │  HTTPS / JSON
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  BACK-END  (FastAPI, hexagonal)   ←── ESTE COFRE DOCUMENTA   │
│  presentation → application → domain ← interfaces            │
└───────────────────────────┬─────────────────────────────────┘
                            │  SQLAlchemy async + asyncpg
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  BANCO  (PostgreSQL 17 + pgcrypto)                           │
│  Tabelas tb_* cifradas (BYTEA)  →  VIEWS lógicas (decifram)  │
│  Lógica de score vive aqui: fn_calcular_score_triagem()      │
└─────────────────────────────────────────────────────────────┘
```

> **Regra de ouro nº 1:** o front fala **exclusivamente** com a API — nunca toca o banco
> diretamente ([[Decisões de Arquitetura (ADRs)|ADR-0001]]).
>
> **Regra de ouro nº 2:** o back-end acessa o banco **somente pelas views** lógicas
> (`pacientes`, `acompanhantes`, `avaliacoes`…), nunca pelas tabelas físicas `tb_*`. As views
> cifram/decifram via triggers e a regra de RBAC (`nivel_1`) reforça isso — ver [[Modelo de Dados (Banco)]].

## O hexágono por dentro (back-end)

A dependência aponta **sempre para o centro** (domínio). Nada no domínio sabe que existe HTTP ou SQL.

```
        HTTP (FastAPI)                          PostgreSQL
            │                                       ▲
            ▼                                       │
   ┌────────────────┐   chama    ┌──────────────┐  │  SQL bruto
   │ PRESENTATION   │ ─────────► │ APPLICATION  │  │  nas views
   │ routers/schemas│            │  use cases   │  │
   └────────────────┘            └──────┬───────┘  │
            ▲                           │ depende de│
            │ injeta (DI)               ▼           │
            │                    ┌──────────────┐   │
            └─────────────────── │   DOMAIN     │   │
                                 │ entidades/VO │   │
                                 └──────────────┘   │
                                        ▲           │
                                        │ implementa │
                                 ┌──────┴───────┐   │
                                 │ INTERFACES   │ ──┘
                                 │ repositórios │
                                 └──────────────┘
```

- **`presentation`** traduz HTTP ↔ casos de uso (Pydantic schemas, routers, masking de PII).
- **`application`** orquestra as regras (use cases + DTOs). É **HTTP-blind** e **SQL-blind**.
- **`domain`** é o coração puro: entidades, value objects ([[Domínio - Entidades e Value Objects|CPF]]),
  e a hierarquia de exceções. Sem FastAPI, sem SQLAlchemy.
- **`interfaces`** (adapters) implementa a persistência com SQL real sobre as views.

Veja a explicação completa em [[As Quatro Camadas]].

## Onde mora cada responsabilidade

| Responsabilidade | Onde vive | Documento |
|------------------|-----------|-----------|
| Autenticação / JWT | `app/core/security.py` + `app/services/auth_service.py` | [[Core - Configuração, Segurança e Exceções]], [[Fluxo - Login e Sessão]] |
| **Cálculo de score** | **No banco** (`fn_calcular_score_triagem`) | [[Cálculo de Score de Triagem]] |
| Orquestração clínica | `application/use_cases/submit_anamnesis.py` | [[Fluxo - Submissão de Anamnese]] |
| Cifragem de PII | Banco (pgcrypto, triggers `INSTEAD OF`) | [[Conformidade LGPD]], [[Modelo de Dados (Banco)]] |
| Mascaramento de PII | `presentation/api/v1/masking.py` | [[Conformidade LGPD]] |
| k-anonimato (LGPD) | `application/use_cases/get_dashboard_stats.py` | [[Fluxo - Dashboard e Histórico]] |
| Injeção de dependências | `app/main.py` + `interfaces/api/dependencies.py` | [[Composition Root (main.py)]] |

## Pegadinha importante

Existe um conjunto de arquivos no `domain/` (entidades `Evaluation`, `ChecklistResponse`, `Symptom`,
`User` e todos os `ports/I*Repository`) que **não está conectado ao sistema em execução** — é
scaffolding de uma versão antiga. **Antes de explorar a fundo, leia
[[Núcleo Ativo vs Scaffolding Legado]]** para não perder tempo com código morto.

## Stack tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Web framework | FastAPI ≥ 0.115 |
| Validação / serialização | Pydantic v2 + pydantic-settings |
| ORM / driver | SQLAlchemy 2.0 (async) + asyncpg |
| Banco | PostgreSQL 17.6 (Supabase) + extensões `pgcrypto`, `pg_trgm` |
| Auth | JWT HS256 (stdlib `hmac`+`hashlib`, sem dependência externa) |
| Forms | python-multipart (login `application/x-www-form-urlencoded`) |

Dependências completas em `pyproject.toml`.
