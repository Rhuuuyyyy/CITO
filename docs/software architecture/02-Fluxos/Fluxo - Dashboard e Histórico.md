---
title: Fluxo - Dashboard e Histórico
tags:
  - fluxo
  - leitura
  - lgpd
  - analytics
---

# Fluxo — Dashboard, Histórico e Estatísticas

Agrupa os endpoints de **leitura analítica**. Há dois mundos distintos aqui, e confundi-los é um erro
comum:

1. **Operacional / pessoal** — números do **próprio médico** (sem anonimização, porque os dados são
   dele): `summary`, `historico`.
2. **Epidemiológico / agregado** — estatísticas de população, **anonimizadas com k-anonimato**
   (LGPD): `stats`.

Router: `presentation/api/v1/routers/history.py`.

## Endpoints

| Método | Rota | Tipo | Anonimização |
|--------|------|------|--------------|
| GET | `/api/v1/pacientes/{id}/historico` | Pessoal | — (RBAC por dono) |
| GET | `/api/v1/dashboard/summary` | Pessoal | — (só dados do médico) |
| GET | `/api/v1/dashboard/stats?uf=&sexo=&etnia=` | Agregado | k-anonimato (k=5) |
| POST | `/api/v1/dashboard/refresh` | Admin | — (refresh da view materializada) |

## 1. Histórico de avaliações — `GET /pacientes/{id}/historico`

```
GetPatientHistoryUseCase.execute(paciente_id, usuario_id, limit, offset)
  • limit capado em 200
  • AvaliacaoReadRepository.count_by_paciente + list_by_paciente
       SELECT ... FROM avaliacoes a JOIN pacientes p ON p.id=a.paciente_id
       WHERE a.paciente_id=:pid AND p.criado_por=:usuario_id   ← RBAC no JOIN
       ORDER BY a.data_avaliacao ASC
```

Devolve cada avaliação com `data_avaliacao`, `score_final` e `recomenda_exame`. Lista vazia é
**legítima** (paciente sem avaliações), não é erro.

## 2. Resumo operacional — `GET /dashboard/summary`

```
GetDashboardSummaryUseCase.execute(usuario_id)
  • DashboardRepository.get_summary(usuario_id) — uma query com 4 subselects:
      total_pacientes        = COUNT pacientes do médico
      avaliacoes_hoje        = avaliações do médico com data = CURRENT_DATE
      avaliacoes_semana      = avaliações nos últimos 7 dias
      taxa_recomendacao_exame= COUNT(recomenda_exame=TRUE) / COUNT(*)  (ROUND 4 casas)
```

> Sem guard de k-anonimato aqui: os números são **exclusivos do médico autenticado**, não há
> agregação entre pacientes de médicos diferentes. Comentário explícito no use case.

## 3. Estatísticas anonimizadas — `GET /dashboard/stats` LGPD

```
GetDashboardStatsUseCase.execute(uf, sexo, etnia)
  • DashboardRepository.get_stats(...) → lê vw_dashboard_anonimizado (materializada)
  • * GUARD k-ANONIMATO:
      para CADA linha retornada:
         if row.total_avaliacoes < K_ANONYMITY_THRESHOLD (=5):
             raise LGPDComplianceError  → HTTP 422  (resposta inteira suprimida)
```

Esta é a regra de privacidade mais explícita do sistema: se **qualquer** grupo estatístico tiver
**menos de 5 avaliações**, a resposta **inteira** é bloqueada — impede reidentificação de indivíduos
em grupos pequenos (LGPD Art. 12). A `vw_dashboard_anonimizado` não contém nenhuma PII (só agregações
por sintoma/sexo/idade/etnia/UF). Ver [[Conformidade LGPD]].

## 4. Refresh da view materializada — `POST /dashboard/refresh` (admin)

```
if doctor.role != "admin": → HTTP 403
RefreshDashboardUseCase.execute()
  • REFRESH MATERIALIZED VIEW CONCURRENTLY vw_dashboard_anonimizado
```

`CONCURRENTLY` mantém a view consultável durante o refresh, mas **exige um índice único** na view
(responsabilidade do grupo de Banco). É o único endpoint restrito a `role='admin'` (checagem inline no
router, a partir do `AuthenticatedDoctor.role`).

## Por que `summary` e `stats` são repositórios diferentes de tudo

`DashboardRepository` reúne os três métodos analíticos (`get_summary`, `get_stats`,
`refresh_materialized_view`) porque todos leem fontes de agregação. `get_summary` é pessoal;
`get_stats`/`refresh` mexem na view materializada anonimizada. A separação **pessoal vs. agregado**
não está em classes diferentes, mas na **presença ou ausência do guard de k-anonimato** no use case.

## Arquivos envolvidos

| Arquivo | Papel |
|---------|-------|
| `presentation/api/v1/routers/history.py` | Os 4 endpoints |
| `presentation/api/v1/schemas/history.py` | `PatientHistoryResponse`, `DashboardSummaryResponse`, `DashboardStatsResponse` |
| `application/use_cases/get_patient_history.py` | Histórico (RBAC) |
| `application/use_cases/get_dashboard_summary.py` | Resumo pessoal |
| `application/use_cases/get_dashboard_stats.py` | **Guard de k-anonimato** |
| `application/use_cases/refresh_dashboard.py` | Refresh (admin) |
| `interfaces/repositories/avaliacao_read_repository.py` | Histórico por paciente |
| `interfaces/repositories/dashboard_repository.py` | `get_summary`, `get_stats`, refresh |

## Relacionados
- [[Conformidade LGPD]] — k-anonimato e mascaramento em profundidade.
- [[Cálculo de Score de Triagem]] — de onde vem `recomenda_exame`/`taxa_recomendacao_exame`.
- [[Modelo de Dados (Banco)|vw_dashboard_anonimizado]]
