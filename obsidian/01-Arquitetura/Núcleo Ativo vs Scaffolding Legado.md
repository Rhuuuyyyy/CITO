---
title: Núcleo Ativo vs Scaffolding Legado
tags:
  - camada/arquitetura
  - armadilha
  - importante
---

# Núcleo Ativo vs Scaffolding Legado

> **Leia isto antes de explorar o `domain/` a fundo.** Nem todo arquivo do back-end faz parte do
> sistema em execução. O projeto nasceu da fusão de um **back-end antigo** (modelado com UUID e
> ports/protocols ao estilo hexagonal "de manual") com a **integração nova** (alinhada ao banco real,
> que usa `int` SERIAL). Parte do código antigo permaneceu como _scaffolding_ não conectado.

Contexto no `SPEC.md` e em [[Decisões de Arquitetura (ADRs)|ADR-0003]]: "o Back-End era uma versão
antiga e desconectada".

## Como identificar o que está ATIVO

O caminho de execução real é sempre:

```
Router (presentation) → Use Case (application) → Repository concreto (interfaces) → View do banco
```

Se um arquivo **não é alcançado** a partir de um `router` (que por sua vez está incluído em
`app/main.py`), ele não roda em produção.

## ATIVO — faz parte do sistema em execução

| Arquivo / módulo | Papel |
|------------------|-------|
| `app/main.py` | [[Composition Root (main.py)\|Composition root]]: cria o app, registra routers e handlers. |
| `presentation/api/v1/routers/*` | Todos os 8 routers, incluídos no app. |
| `presentation/api/v1/schemas/*` | Contratos Pydantic em uso. |
| `presentation/api/v1/masking.py` | Mascaramento de PII. |
| `application/use_cases/*` | Todos os 13 use cases (cada router usa pelo menos um). |
| `application/dtos/anamnesis.py` | DTOs do fluxo de anamnese. |
| `domain/entities/patient.py` | **Entidade `Patient`** — usada por `RegisterPatientUseCase`. |
| `domain/entities/acompanhante.py` | **Entidade `Acompanhante`** — idem. |
| `domain/value_objects/cpf.py` | **`CPF`** — usado em cadastro e busca. |
| `domain/services/symptom_scoring_orchestrator.py` | Chama `fn_calcular_score_triagem` no banco. |
| `interfaces/repositories/*` | **Todos** os adapters concretos (com SQL). |
| `interfaces/api/dependencies.py` | `get_current_doctor()` — guard de JWT. |
| `core/*` | `config.py`, `security.py`, `exceptions.py`. |
| `db/database.py` | Engine + sessão + injeção da `pgp_key`. |
| `services/auth_service.py` | Sessões e auditoria de login. |

## LEGADO / ÓRFÃO — não conectado ao runtime

Estes arquivos existem, importam corretamente (o `import app.main` não quebra), mas **nenhum router
ou use case ativo os utiliza**. Confirmado por busca: só se referenciam entre si.

| Arquivo / módulo | Por que é órfão |
|------------------|-----------------|
| `domain/ports/patient_repository.py` (`IPatientRepository`) | Protocol baseado em **UUID**; nenhum use case importa de `domain.ports`. Os use cases usam as classes concretas de `interfaces/repositories`. |
| `domain/ports/evaluation_repository.py` (`IEvaluationRepository`) | Idem; o fluxo de avaliação usa `AvaliacaoRepository` concreto. |
| `domain/ports/checklist_response_repository.py` | Idem. |
| `domain/ports/symptom_repository.py` (`ISymptomRepository`) | Idem; sintomas vêm de `SymptomReadRepository`. |
| `domain/ports/user_repository.py` (`IUserRepository`) | Idem; autenticação usa `AuthService` (SQL direto). |
| `domain/entities/evaluation.py` (`Evaluation`, `ScoreBand`, `Recommendation`) | Entidade rica com UUID; o fluxo real grava em `tb_avaliacoes` via repositório e devolve `int`. |
| `domain/entities/checklist_response.py` (`ChecklistResponse`, `ChecklistItem`) | UUID-based; o checklist real trafega como `ChecklistItemDTO` (com `int`). |
| `domain/entities/symptom.py` (`SymptomCategory`, `AgeRelevance`) | Enums não usados pelo `SymptomReadRepository` (que devolve só `id`+`descricao`). Note que a classe `Symptom` é importada pelo port órfão mas **nem é definida** no arquivo. |
| `domain/entities/user.py` (`User`, `UserRole`) | Entidade de usuário não usada; a identidade autenticada é o dataclass `AuthenticatedDoctor`. |
| `app/presentation/middlewares/` | Pasta efetivamente vazia (`__init__.py`). |
| `app/core/.gitkeep`, `app/db/.gitkeep`, etc. | Placeholders de pasta. |

## Consequência prática (o que fazer com isso)

- **Ao estudar o sistema:** ignore `domain/ports/` e as entidades `Evaluation`/`ChecklistResponse`/
  `Symptom`/`User`. Elas descrevem um design idealizado que **não** corresponde ao código que roda.
- **Ao implementar algo novo:** siga o padrão **ativo** — entidade simples + DTO + repositório
  concreto com `int`, espelhando [[Fluxo - Cadastro de Paciente]] e [[Fluxo - Submissão de Anamnese]].
- **Ao limpar dívida técnica:** estes arquivos órfãos são candidatos a remoção (ou a "religação", se
  a equipe decidir adotar os ports de verdade). Hoje servem só de ruído. Considere abrir um ADR antes
  de apagar, para registrar a decisão.

## Mapa mental

```
                    ┌─────────────────────────────┐
   RODA EM PROD ──► │ routers → use cases →        │
                    │ repos concretos → views      │  ← entidades Patient/Acompanhante + CPF
                    └─────────────────────────────┘
                    ┌─────────────────────────────┐
   NÃO CONECTADO ─► │ domain/ports/I*Repository    │  ← scaffolding do back-end antigo
                    │ entities Evaluation/User/... │     (UUID, design hexagonal "de manual")
                    └─────────────────────────────┘
```

## Relacionados
- [[Arquitetura Hexagonal (Ports & Adapters)]] — por que os ports existem (em teoria).
- [[Domínio - Entidades e Value Objects]] — detalha quais entidades são reais.
- [[Decisões de Arquitetura (ADRs)|ADR-0003]] — a decisão de usar `int` SERIAL.
