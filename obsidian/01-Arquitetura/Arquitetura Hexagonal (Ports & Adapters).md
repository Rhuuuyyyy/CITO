---
title: Arquitetura Hexagonal (Ports & Adapters)
tags:
  - camada/arquitetura
  - padrao
---

# Arquitetura Hexagonal (Ports & Adapters)

A arquitetura hexagonal (também chamada _ports & adapters_, de Alistair Cockburn) busca isolar a
**lógica de negócio** das tecnologias que entram e saem dela (web, banco, filas). O CITO adota uma
versão **pragmática** desse padrão.

## A ideia em uma frase

> O **domínio** (regras de negócio) fica no centro e **não sabe** se está sendo chamado por HTTP, CLI
> ou teste, nem se persiste em PostgreSQL, memória ou arquivo. Tudo que é tecnologia é um **adapter**
> plugado na borda.

## Ports e Adapters

- **Port (porta):** um _contrato_ (interface). Diz **o que** pode ser feito, não **como**.
- **Adapter (adaptador):** uma _implementação_ concreta de um port para uma tecnologia específica.
  - _Driving adapter_ (entrada): o que **aciona** o sistema → os **routers** FastAPI.
  - _Driven adapter_ (saída): o que o sistema **aciona** → os **repositórios** SQL.

```
   DRIVING (entrada)            NÚCLEO                 DRIVEN (saída)
 ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
 │ Router FastAPI   │───►│   Use Case       │───►│ Repository (SQL) │
 │ (presentation)   │    │ + Domain (puro)  │    │ (interfaces)     │
 └──────────────────┘    └──────────────────┘    └──────────────────┘
   HTTP → caso de uso       regras de negócio       views do Postgres
```

## Como o CITO aplica o padrão

 **O que segue o padrão fielmente:**
- O **domínio é puro**: `domain/entities/patient.py`, `domain/value_objects/cpf.py` só usam stdlib +
  Pydantic. Nenhum `import fastapi` ou `import sqlalchemy` lá.
- Os **use cases são HTTP-blind**: lançam exceções de domínio (`LGPDComplianceError`,
  `NotFoundError`…), nunca `HTTPException`. Quem traduz para HTTP são os _exception handlers_ em
  [[Composition Root (main.py)|main.py]].
- Os **adapters de saída** encapsulam todo o SQL: nenhum use case escreve `SELECT`/`INSERT`.
- O **driving adapter** (router) só traduz: recebe Pydantic → monta DTO → chama `execute()` → formata
  resposta. Ver [[Fluxo - Submissão de Anamnese]].

 **Onde o CITO se desvia do "manual" (e por quê):**
- Num hexágono clássico, o use case dependeria de um **port** (Protocol) e o adapter o implementaria,
  com a injeção amarrando os dois. No CITO, os use cases importam **diretamente as classes concretas**
  de `interfaces/repositories/`. É mais simples e direto para o tamanho do projeto, mas:
  - Os **Protocols em `domain/ports/`** (`IPatientRepository`, etc.) ficaram **órfãos** — ninguém os
    usa. Ver [[Núcleo Ativo vs Scaffolding Legado]].
  - A troca de implementação (ex.: um repositório fake para teste) exige _monkeypatch_ ou herança,
    não apenas trocar a injeção.

## Por que isso importa na prática

| Benefício | Como o CITO colhe |
|-----------|-------------------|
| **Testar regras sem banco** | `python -c "import app.main"` valida todo o wiring sem conectar ao Postgres (asyncpg conecta _lazy_). O `check_contract.py` valida o contrato sem banco. |
| **Trocar o JWT sem tocar no resto** | `core/security.py` isola HS256; trocar para RS256 mexe só nesse arquivo (comentário no próprio código). |
| **Regra de score centralizada** | Mesmo morando no banco, ela é acessada por **um** adapter ([[Cálculo de Score de Triagem|SymptomScoringOrchestrator]]). |
| **PII contida** | Cifragem no banco + máscara só na borda (`masking.py`) — o núcleo trabalha com dados em claro. |

## Invariantes que o projeto promete preservar

Do `SPEC.md`, estes são os princípios que **qualquer mudança deve manter**:

- Injeção da `pgp_key` por sessão (nunca no código) — ver `db/database.py`.
- Proteção contra brute-force no `AuthService`.
- Score calculado via `fn_calcular_score_triagem` (lógica no banco, não duplicada em Python).
- Hierarquia de exceções de domínio + handlers HTTP centralizados.
- Repositórios sem HTTP; use cases sem SQL.
- Acesso ao banco **só pelas views**.

## Relacionados
- [[As Quatro Camadas]] — o recorte concreto em pastas.
- [[Núcleo Ativo vs Scaffolding Legado]] — o que está realmente plugado.
- [[Composition Root (main.py)]] — onde os adapters são montados.
