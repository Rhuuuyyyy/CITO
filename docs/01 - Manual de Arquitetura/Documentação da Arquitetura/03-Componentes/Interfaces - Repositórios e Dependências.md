---
title: Interfaces - Repositórios e Dependências
tags:
  - camada/interfaces
  - referencia
  - persistencia
---

# Interfaces — Repositórios e Dependências

A camada `interfaces/` é onde mora o **SQL bruto** (adapters de saída) e o **guard de autenticação**
(adapter de entrada). Todo acesso ao banco passa por aqui, sempre contra as **views** lógicas (nunca
as tabelas `tb_*`).

## Convenções gerais dos repositórios

- Cada repositório recebe a `AsyncSession` no construtor: `def __init__(self, session): self._session = session`.
- Usam `sqlalchemy.text("...")` com **parâmetros nomeados** (`:param`) — nunca string interpolada com
  dado do usuário (evita SQL injection). As cláusulas `WHERE` dinâmicas montam só **nomes de coluna
  fixos** + placeholders.
- Inserts usam `RETURNING id` e devolvem o id (ou a entidade com id preenchido via `model_copy`).
- Repositórios de **leitura** devolvem _dataclasses_ achatadas (read models), não entidades de domínio.

## `interfaces/api/dependencies.py` — o guard de autenticação

```python
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

@dataclass(frozen=True)
class AuthenticatedDoctor:
    usuario_id: int
    sessao_id: int
    role: str

async def get_current_doctor(token = Depends(oauth2_scheme)) -> AuthenticatedDoctor:
    claims = verify_access_token(token)        # cripto pura, NÃO toca o banco
    if claims.role not in ("doctor","admin"):  # → HTTP 403
        ...
    return AuthenticatedDoctor(claims.usuario_id, claims.sessao_id, claims.role)
```

- É a dependência que **protege quase todos os endpoints**. Token ausente/expirado/adulterado → **401**.
- A verificação é **só criptográfica** (não há _hit_ no banco para validar o token) — barato e rápido.
- O `usuario_id` resultante é o que **escopa** todas as queries ao médico dono (defesa contra IDOR;
  [[Decisões de Arquitetura (ADRs)|ADR-0003]]). Ver uso em [[Fluxo - Listagem de Pacientes]].

## Catálogo de repositórios

### Escrita / lifecycle

| Repositório | Tabela/View | Métodos-chave |
|-------------|-------------|---------------|
| `PatientRepository` | view `pacientes` | `add` (INSERT, nome cifrado pelo trigger), `get_by_id`, `get_by_cpf` |
| `AcompanhanteRepository` | view `acompanhantes` | `add`, `list_all`, `get_by_id`, `get_by_cpf` |
| `AvaliacaoRepository` | view `avaliacoes` + `tb_log_analises` | `create_rascunho`, `open_log_analise` |
| `ChecklistRepository` | `respostas_checklist` | `insert_respostas` (bulk) |
| `HistoricoFamiliarRepository` | `tb_historico_familiar` | `add` (1 por avaliação) |
| `EncaminhamentoRepository` | `tb_encaminhamentos` | `add` (ex.: `exame_fmr1` automático) |
| `AuditRepository` | `fn_registrar_auditoria` | `registrar` (**best-effort**, SAVEPOINT + try/except) |
| `AgendamentoRepository` | `tb_agendamentos` | `list_active`, `add` |

### Leitura (read models / CQRS-lite)

| Repositório | Fonte | Devolve |
|-------------|-------|---------|
| `PatientReadRepository` | view `pacientes` + JOINs | `PatientListItem`, `PatientDetail` (JOIN LATERAL p/ última avaliação) |
| `AvaliacaoReadRepository` | view `avaliacoes` JOIN `pacientes` | `AvaliacaoHistoricoItem` (RBAC no JOIN) |
| `DashboardRepository` | `vw_dashboard_anonimizado` + agregações | `DashboardRow`, `DashboardSummary`; `refresh_materialized_view` |
| `SymptomReadRepository` | `sintomas` | `SintomaItem` (só `ativo=TRUE`) |
| `RelatorioRepository` | view `avaliacoes` JOIN `pacientes` | `RelatorioAvaliacaoItem` (finalizadas) |

> Há **dois** repositórios para "paciente" (escrita `PatientRepository` vs. leitura
> `PatientReadRepository`) — separação CQRS-lite explicada em [[Fluxo - Listagem de Pacientes]].

## Padrões que vale conhecer

### Auditoria que nunca derruba o fluxo (`AuditRepository`)
```python
async with self._session.begin_nested():   # SAVEPOINT
    await self._session.execute(text("SELECT fn_registrar_auditoria(...)"), {...})
# except Exception: logger.warning(...)   ← engole a falha
```
Se a função de auditoria não existir/falhar, o SAVEPOINT isola o erro e o fluxo clínico segue. Decisão
do [[Decisões de Arquitetura (ADRs)|ADR-0004]].

### Mapear linha → entidade (`PatientRepository._row_to_patient`)
Converte uma `RowMapping` da view de volta para a entidade `Patient`, traduzindo strings em enums
(`SexAtBirth`, `Etnia`, `Escolaridade`) e tratando NULLs. O `cpf` vem `None` (a view só tem o hash).

### Where dinâmico seguro (`PatientReadRepository.list_by_doctor`)
Monta `conditions` só com fragmentos fixos (`p.nome ILIKE :nome_filter`) e injeta valores por
parâmetro — o `usuario_id` sempre presente garante o RBAC.

## Suposições sobre o banco

Os repositórios assumem comportamentos de **triggers/defaults/grants** que não são verificáveis por
`import` (só em runtime). A lista completa está no `SPEC.md` (seção "Suposições sobre o banco") e em
[[Modelo de Dados (Banco)]]. Os principais:
- view `avaliacoes` expõe `recomenda_exame` ([[Decisões de Arquitetura (ADRs)|ADR-0005]]);
- `tb_avaliacoes.status` default `'rascunho'`, `data_avaliacao` default `now()`;
- grants do `nivel_1` para escrever nas views e nas tabelas não-PII + EXECUTE nas funções.

## Relacionados
- [[Aplicação - Use Cases e DTOs]] — quem consome estes adapters.
- [[Core - Configuração, Segurança e Exceções]] — a sessão e a `pgp_key`.
- [[Modelo de Dados (Banco)]] — as views e tabelas alvo.
- [[Núcleo Ativo vs Scaffolding Legado]] — por que estes (concretos) e não os Protocols.
