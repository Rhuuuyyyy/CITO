---
title: Aplicação - Use Cases e DTOs
tags:
  - camada/aplicacao
  - referencia
---

# Aplicação — Use Cases e DTOs

A camada `application/` orquestra a regra de negócio. **Um use case = uma operação de negócio**, com
um método `execute()`. São **HTTP-blind** (lançam exceções de domínio, nunca `HTTPException`) e
recebem suas dependências por construtor (injeção explícita, sem _service locator_).

## Padrão comum de um use case

```python
class XUseCase:
    def __init__(self, repo: SomeRepository) -> None:
        self._repo = repo
    async def execute(self, *, ...campos...) -> ResultDTO:
        ...regra...
        return ResultDTO(...)
```

O **router** monta o use case com os repositórios concretos (sobre a `AsyncSession` da requisição) e
chama `execute()`. Ver [[Composition Root (main.py)]].

## Catálogo dos 13 use cases

| Use case | Operação | Destaque | Fluxo |
|----------|----------|----------|-------|
| `RegisterPatientUseCase` | Cadastrar paciente (+ acompanhante) | Dedup de acompanhante por CPF | [[Fluxo - Cadastro de Paciente]] |
| `SubmitAnamnesisUseCase` | Submeter triagem completa | 7 passos, score no banco, auditoria best-effort | [[Fluxo - Submissão de Anamnese]] |
| `GetPatientListUseCase` | Listar pacientes do médico | Hash do CPF no use case; `HARD_LIMIT=200` | [[Fluxo - Listagem de Pacientes]] |
| `GetPatientDetailUseCase` | Prontuário de 1 paciente | `None` → 404 (RBAC por dono) | [[Fluxo - Listagem de Pacientes]] |
| `GetPatientHistoryUseCase` | Histórico de avaliações | RBAC no JOIN; limit 200 | [[Fluxo - Dashboard e Histórico]] |
| `GetDashboardSummaryUseCase` | Resumo operacional do médico | **Sem** k-anonimato (dados próprios) | [[Fluxo - Dashboard e Histórico]] |
| `GetDashboardStatsUseCase` | Estatísticas agregadas | **Guard de k-anonimato (k=5)** → `LGPDComplianceError` | [[Fluxo - Dashboard e Histórico]] |
| `RefreshDashboardUseCase` | Refresh da view materializada | Admin-only (checado no router) | [[Fluxo - Dashboard e Histórico]] |
| `GetSymptomsUseCase` | Catálogo de sintomas ativos | Monta o checklist da triagem | [[Contrato de API (Endpoints)]] |
| `CreateAgendamentoUseCase` | Criar agendamento | — | [[Contrato de API (Endpoints)]] |
| `GetAgendamentosUseCase` | Listar agenda ativa do médico | Exclui `cancelado` | [[Contrato de API (Endpoints)]] |
| `GetAcompanhantesUseCase` | Listar acompanhantes | Para seleção em formulários | [[Contrato de API (Endpoints)]] |
| `GetRelatorioAvaliacoesUseCase` | Avaliações finalizadas p/ relatório | **Não** depende de `recomenda_exame` (front computa) | [[Contrato de API (Endpoints)]] |

## Os dois use cases que carregam regra de verdade

A maioria é "fino" (delega ao repositório). Dois concentram regra real:

### `SubmitAnamnesisUseCase` — a orquestração clínica
Sequencia 6 repositórios + o orchestrator de score numa única transação. É o melhor lugar para
entender como as camadas colaboram. Ver [[Fluxo - Submissão de Anamnese]].

### `GetDashboardStatsUseCase` — o guard de privacidade
```python
K_ANONYMITY_THRESHOLD = 5
for row in rows:
    if row.total_avaliacoes < K_ANONYMITY_THRESHOLD:
        raise LGPDComplianceError(...)   # suprime a RESPOSTA INTEIRA
```
Política de k-anonimato no nível de aplicação (LGPD Art. 12). Ver [[Conformidade LGPD]].

## DTOs (`application/dtos/`)

DTOs desacoplam o use case dos schemas HTTP. O router traduz **schema Pydantic → DTO** antes de chamar
`execute()`. Hoje só o fluxo de anamnese tem DTOs dedicados:

| DTO (`dtos/anamnesis.py`) | Conteúdo |
|---------------------------|----------|
| `ChecklistItemDTO` | `sintoma_id: int`, `presente: bool`, `observacao: str` |
| `HistoricoFamiliarDTO` | 8 booleanos hereditários + `descricao_outros` |
| `SubmitAnamnesisDTO` | `paciente_id`, `sessao_id`, `observacoes`, `diagnostico_previo_fxs`, `respostas[]`, `historico_familiar` |

> Note o contraste com o domínio legado: os DTOs usam **`int`** para `sintoma_id`, enquanto a entidade
> órfã `ChecklistItem` usa `UUID`. O caminho ativo é o dos DTOs ([[Núcleo Ativo vs Scaffolding Legado]]).

Os demais use cases recebem parâmetros nomeados simples e devolvem _result dataclasses_ frozen (ex.:
`PatientListResult`, `DashboardStatsResult`, `AnamnesisResult`).

## Por que os use cases dependem dos repositórios concretos (e não de Protocols)

Decisão pragmática do projeto: os use cases importam direto de `interfaces/repositories/`. Os Protocols
em `domain/ports/` ficaram órfãos. Trade-offs em
[[Arquitetura Hexagonal (Ports & Adapters)]] e [[Núcleo Ativo vs Scaffolding Legado]].

## Relacionados
- [[Interfaces - Repositórios e Dependências]] — os adapters que os use cases consomem.
- [[Apresentação - Routers, Schemas e Masking]] — quem chama os use cases.
- [[Domínio - Entidades e Value Objects]] — os tipos que circulam.
