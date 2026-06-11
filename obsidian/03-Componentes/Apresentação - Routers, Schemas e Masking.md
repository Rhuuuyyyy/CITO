---
title: Apresentação - Routers, Schemas e Masking
tags:
  - camada/apresentacao
  - referencia
  - http
---

# Apresentação — Routers, Schemas e Masking

A camada `presentation/api/v1/` é a **borda HTTP**. Faz três coisas: define endpoints (routers),
define o **contrato** com o front (schemas Pydantic) e **mascara PII** antes de responder.

## Routers (`routers/`)

Cada router declara um `APIRouter(prefix=..., tags=[...])` e é incluído em
[[Composition Root (main.py)|main.py]] sob `/api/v1`. O padrão de um endpoint:

```python
@router.post("", response_model=XResponse, status_code=201)
async def handler(
    payload: XRequest,
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),   # auth
    session: AsyncSession = Depends(get_db_session),             # unit of work
) -> XResponse:
    use_case = XUseCase(repo=ConcreteRepo(session))   # injeção manual (factory)
    result = await use_case.execute(...)
    return XResponse(...)                              # mascara PII aqui
```

| Router | Prefixo | Endpoints | Fluxo |
|--------|---------|-----------|-------|
| `auth` | `/auth` | login, logout | [[Fluxo - Login e Sessão]] |
| `patients` | `/pacientes` | criar, listar, detalhe | [[Fluxo - Cadastro de Paciente]], [[Fluxo - Listagem de Pacientes]] |
| `anamnesis` | `/avaliacoes` | submeter triagem | [[Fluxo - Submissão de Anamnese]] |
| `history` | (vários) | histórico, dashboard summary/stats/refresh | [[Fluxo - Dashboard e Histórico]] |
| `symptoms` | `/sintomas` | catálogo | [[Contrato de API (Endpoints)]] |
| `agendamentos` | `/agendamentos` | listar, criar | [[Contrato de API (Endpoints)]] |
| `relatorios` | `/relatorios` | avaliações finalizadas | [[Contrato de API (Endpoints)]] |
| `acompanhantes` | `/acompanhantes` | listar | [[Contrato de API (Endpoints)]] |

> O router de `history` **não** tem `prefix` próprio — declara caminhos completos
> (`/pacientes/{id}/historico`, `/dashboard/*`) porque cobre recursos de namespaces diferentes.

## Schemas (`schemas/`) — o contrato

Modelos Pydantic v2 de **request** e **response**. Característica-chave: quase todos usam
**`extra="forbid"`** — um campo a mais ou renomeado **falha a validação**. Isso, somado ao
`scripts/check_contract.py`, trava o contrato front↔back (pega divergência antes do E2E).

| Schema | Tipo | Notas |
|--------|------|-------|
| `TokenLoginResponse` | resp | inclui `usuario_id` **e** `sessao_id` (ambos consumidos pelo front) |
| `PatientCreateRequest` | req | só `nome`/`data_nascimento`/`sexo` obrigatórios; bloco `acompanhante` opcional |
| `AcompanhanteCreateRequest` | req | exige `nome` + `relacao`; `cpf`/`telefone`/`email` opcionais |
| `PatientResponse` | resp | `nome_masked`, sem CPF |
| `PatientListItemSchema` | resp | `cpf_masked`, resumo clínico (`ultimo_score`, `recomenda_exame`) |
| `PatientDetailResponse` | resp | prontuário; `cpf_masked`; nome em claro (médico dono) |
| `SubmitAnamnesisRequest` | req | `respostas` com `min_length=1`; `historico_familiar` com default |
| `AvaliacaoResponse` | resp | `score_final`, `limiar_usado`, `recomenda_exame`, `versao_param`, `status` |
| `DashboardStatsResponse` | resp | inclui `k_anonymity_threshold` (default 5) |
| `AgendamentoCreateRequest`/`Schema` | req/resp | agenda |
| `RelatorioAvaliacaoSchema` | resp | `nome_masked`, `score_final`, `sexo` |
| `SintomaSchema`, `AcompanhanteListItemSchema` | resp | listas simples |

## Masking (`masking.py`) — LGPD na borda

Helpers minúsculos, mas centrais para a [[Conformidade LGPD]]:

```python
CPF_MASK = "***.***.***-**"          # placeholder fixo (no banco só existe o hash)

def mask_name(full_name: str) -> str:
    # "Maria Aparecida Silva" → "Maria A*** S***"
    parts = full_name.split()
    if len(parts) > 1:
        return parts[0] + " " + " ".join(p[0] + "***" for p in parts[1:])
    return (full_name[0] + "***") if full_name else "***"
```

- `mask_name` mostra o **primeiro nome** e mascara os sobrenomes.
- O CPF nunca é devolvido em claro (a API só tem o hash); usa-se o placeholder `CPF_MASK`.
- A política de **onde** mascarar varia por endpoint (a lista mascara CPF; o detalhe mostra nome ao
  dono) — racional em [[Decisões de Arquitetura (ADRs)|ADR-0002]] e [[Conformidade LGPD]].

## Por que a tradução schema → DTO → use case

O router **não** passa o schema Pydantic direto ao use case (exceto onde é trivial). No fluxo de
anamnese, ele converte `SubmitAnamnesisRequest` → `SubmitAnamnesisDTO` (`_to_dto`). Isso mantém o use
case **independente da forma HTTP**: mudar o JSON do front não obriga a mexer na regra. Ver
[[Aplicação - Use Cases e DTOs]].

## Relacionados
- [[Composition Root (main.py)]] — onde os routers entram no app e os erros viram HTTP.
- [[Aplicação - Use Cases e DTOs]] — o destino das chamadas.
- [[Contrato de API (Endpoints)]] — a tabela completa de endpoints.
- [[Conformidade LGPD]] — mascaramento.
