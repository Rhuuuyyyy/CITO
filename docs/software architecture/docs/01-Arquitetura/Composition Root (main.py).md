---
title: Composition Root (main.py)
tags:
  - camada/arquitetura
  - core
  - entrypoint
---

# Composition Root (`app/main.py`)

`app/main.py` é a **raiz de composição** da arquitetura hexagonal: o **único** arquivo autorizado a
importar de todas as camadas. É aqui que o app FastAPI é criado, os middlewares e handlers são
registrados e os routers são costurados. O objeto ASGI exportado é `app` (usado por
`uvicorn app.main:app`).

> Arquivo: `app/main.py` · Entrypoint de execução: `run.py` (sobe `uvicorn` + front estático).

## O que `create_app()` faz, em ordem

```
1. get_settings()              → carrega configuração tipada (.env)            [core/config.py]
2. FastAPI(...)                → cria o app (title, version, docs em /api/v1/docs)
3. CORSMiddleware              → libera a origem do front (settings.cors_origins)
4. Exception handlers          → mapeia exceções de DOMÍNIO → HTTP (RFC 7807)
5. include_router(...) × 8     → registra todos os endpoints sob /api/v1
6. GET /health                 → probe de saúde (fora do prefixo, p/ infra/k8s)
```

## 1. Configuração e ciclo de vida

- `lifespan`: no _shutdown_, faz `await engine.dispose()` (fecha o pool de conexões). Não há _startup_
  pesado — o asyncpg conecta _lazy_, o que permite `import app.main` sem banco no ar.
- `settings`: instância **cacheada** (`@lru_cache`) de `Settings`, injetável via FastAPI `Depends`.
  Ver [[Core - Configuração, Segurança e Exceções]].

## 2. CORS

```python
if settings.cors_origins:
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                       allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
```

> Sem a origem exata do front em `CORS_ORIGINS`, o navegador **bloqueia tudo**. É a causa nº 1 de
> "a API responde no curl mas o front não funciona". Ver [[Decisões de Arquitetura (ADRs)|ADR-0001]].

## 3. Exception handlers — a ponte domínio → HTTP

Aqui se materializa a regra "o domínio nunca lança `HTTPException`". Cada exceção da hierarquia em
`core/exceptions.py` vira uma resposta JSON no formato **RFC 7807 (Problem Details)**:

| Exceção de domínio | HTTP | Significado |
|--------------------|------|-------------|
| `NotFoundError` | 404 | Recurso não existe |
| `ConflictError` | 409 | Recurso já existe |
| `AuthenticationError` | 401 | Não autenticado |
| `AuthorizationError` | 403 | Sem permissão |
| `LGPDComplianceError` | 422 | Violação de privacidade (ex.: [[Conformidade LGPD\|k-anonimato]]) |
| `DomainError` | 422 | Regra de negócio violada |
| `SXFpError` (base) | 500 | Erro interno (detalhe genérico, não vaza stack) |

Corpo padrão: `{"type": <code>, "title": <título>, "detail": <mensagem>}`. O `code` vem do atributo
de classe da exceção (ex.: `lgpd.violation`). Ver [[Core - Configuração, Segurança e Exceções]].

## 4. Routers registrados (todos sob `settings.api_prefix = /api/v1`)

| Router | Prefixo | Documento |
|--------|---------|-----------|
| `anamnesis` | `/avaliacoes` | [[Fluxo - Submissão de Anamnese]] |
| `auth` | `/auth` | [[Fluxo - Login e Sessão]] |
| `patients` | `/pacientes` | [[Fluxo - Cadastro de Paciente]], [[Fluxo - Listagem de Pacientes]] |
| `history` | `/pacientes/{id}/historico`, `/dashboard/*` | [[Fluxo - Dashboard e Histórico]] |
| `symptoms` | `/sintomas` | [[Contrato de API (Endpoints)]] |
| `agendamentos` | `/agendamentos` | [[Contrato de API (Endpoints)]] |
| `relatorios` | `/relatorios` | [[Contrato de API (Endpoints)]] |
| `acompanhantes` | `/acompanhantes` | [[Contrato de API (Endpoints)]] |

## 5. Health probe

`GET /health` (fora do `/api/v1`) → `{"status": "ok", "service": <app_name>}`. Usado por
infraestrutura/k8s e pelo `run.py` para saber quando a API subiu.

## Onde a injeção de dependências realmente acontece

`main.py` costura os **routers**, mas a montagem dos casos de uso com seus repositórios é feita
**dentro de cada router**, via _factory_, usando a `AsyncSession` da requisição. Exemplo do
[[Fluxo - Submissão de Anamnese|anamnesis.py]]:

```python
def _build_use_case(session: AsyncSession) -> SubmitAnamnesisUseCase:
    return SubmitAnamnesisUseCase(
        avaliacoes=AvaliacaoRepository(session),
        checklist=ChecklistRepository(session),
        historico=HistoricoFamiliarRepository(session),
        scoring=SymptomScoringOrchestrator(),
        encaminhamentos=EncaminhamentoRepository(session),
        audit=AuditRepository(session),
    )
```

A `AsyncSession` vem de `Depends(get_db_session)` e a identidade do médico de
`Depends(get_current_doctor)` — ver [[Interfaces - Repositórios e Dependências]].

## Relacionados
- [[As Quatro Camadas]] · [[Arquitetura Hexagonal (Ports & Adapters)]]
- [[Core - Configuração, Segurança e Exceções]] — config, JWT e exceções detalhados.
