---
title: Fluxo - Submissão de Anamnese
tags:
  - fluxo
  - clinico
  - destaque
---

# Fluxo — Submissão de Anamnese (o coração clínico)

Este é o fluxo central do CITO: o médico preenche o checklist de sintomas + histórico familiar de um
paciente e o sistema **calcula o score de triagem**, decide se **recomenda o exame genético FMR1** e
registra tudo. Foi consolidado num **único endpoint** (`POST /api/v1/avaliacoes`) por decisão de
arquitetura — ver [[Decisões de Arquitetura (ADRs)|ADR-0004]].

> Veja o diagrama: [[Fluxo de Submissão de Anamnese.canvas| Fluxo de Submissão de Anamnese (Canvas)]]

## Endpoint

`POST /api/v1/avaliacoes` · autenticado (Bearer JWT) · status 201 · router em
`presentation/api/v1/routers/anamnesis.py`.

### Payload (request) — `SubmitAnamnesisRequest`

```json
{
  "paciente_id": 12,
  "sessao_id": 34,
  "observacoes": "",
  "diagnostico_previo_fxs": false,
  "respostas": [
    { "sintoma_id": 1, "presente": true, "observacao": "" },
    { "sintoma_id": 2, "presente": false }
  ],
  "historico_familiar": {
    "deficiencia_intelectual": true,
    "autismo_na_familia": false,
    "epilepsia": false,
    "falencia_ovariana_precoce": false,
    "infertilidade_masculina": false,
    "menopausa_precoce": false,
    "abortos_recorrentes": false,
    "tremor_ataxia_familiar": false,
    "descricao_outros": null
  }
}
```

`respostas` exige `min_length=1` (não aceita lista vazia).

### Resposta — `AvaliacaoResponse`

```json
{
  "avaliacao_id": 99, "paciente_id": 12,
  "score_final": 0.89, "limiar_usado": 0.56,
  "recomenda_exame": true, "versao_param": "ROMERO_2025_v1_M",
  "status": "finalizada"
}
```

## Passo a passo (camada por camada)

```
┌─ presentation/routers/anamnesis.py ───────────────────────────────────────┐
│ 1. get_current_doctor()  → valida JWT, devolve AuthenticatedDoctor         │
│ 2. _to_dto(payload)      → SubmitAnamnesisRequest → SubmitAnamnesisDTO      │
│ 3. _build_use_case(session) → injeta os 6 repositórios + orchestrator      │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    ▼
┌─ application/use_cases/submit_anamnesis.py — execute() ────────────────────┐
│ Step 1  AvaliacaoRepository.create_rascunho()  → INSERT avaliacoes         │
│         (status='rascunho')  → retorna avaliacao_id                        │
│ Step 2  AvaliacaoRepository.open_log_analise() → INSERT tb_log_analises    │
│ Step 3  ChecklistRepository.insert_respostas() → INSERT respostas_checklist│
│ Step 4  HistoricoFamiliarRepository.add()      → INSERT tb_historico_fam.  │
│ Step 5  SymptomScoringOrchestrator.execute_scoring()                       │
│         → SELECT * FROM fn_calcular_score_triagem(avaliacao_id)   * BANCO  │
│           (calcula score, finaliza avaliação, fecha log, audita)           │
│ Step 6  SE recomenda_exame:                                                │
│         EncaminhamentoRepository.add(tipo='exame_fmr1', auto=True)         │
│ Step 7  AuditRepository.registrar('AVALIACAO_FINALIZADA')  [best-effort]   │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    ▼
                  AnamnesisResult(avaliacao_id, scoring) → AvaliacaoResponse
```

> **Atomicidade:** todos os passos rodam na **mesma `AsyncSession`** (a unidade de trabalho). O
> `get_db_session` faz `commit()` no fim ou `rollback()` em qualquer exceção — ver
> [[Core - Configuração, Segurança e Exceções|database.py]]. Logo, se o passo 4 falhar, os passos 1–3
> são desfeitos juntos.

## Detalhes que pegam gente desprevenida

### O score é calculado no BANCO, não no Python

O `SymptomScoringOrchestrator` (em `domain/services/`) só faz **uma** coisa: chamar
`fn_calcular_score_triagem(avaliacao_id)`. A função no banco lê as respostas, multiplica cada sintoma
**presente** pelo peso do **sexo do paciente**, soma, compara com o limiar vigente e **finaliza** a
avaliação (`status → 'finalizada'`). O back-end **não duplica** essa regra — ver
[[Cálculo de Score de Triagem]] e [[Decisões de Arquitetura (ADRs)|ADR-0005]].

### `diagnostico_previo_fxs` suprime a recomendação, não o score

Se o paciente já tem diagnóstico molecular confirmado, o **score ainda é calculado** (para auditoria
do modelo), mas a view `avaliacoes` devolve `recomenda_exame = false`. Logo o passo 6 não cria
encaminhamento. A regra mora na view (`CASE WHEN a.diagnostico_previo_fxs THEN false`).

### Auditoria é "best-effort"; histórico e encaminhamento são fatais

O passo 7 roda dentro de um `begin_nested()` (SAVEPOINT) com `try/except` que **engole** falhas: se a
função de auditoria não existir, o fluxo clínico **não** quebra. Já os passos 4 e 6 são fatais
(consistência clínica importa). Decisão registrada no [[Decisões de Arquitetura (ADRs)|ADR-0004]].

### Possível log duplicado (não-fatal)

O passo 2 insere em `tb_log_analises`, e a `fn_calcular_score_triagem` "também registra a análise nos
logs". Isso pode gerar **duas linhas** em `tb_log_analises` para a mesma avaliação. É ruído de
auditoria, não quebra nada (item 8 da checklist E2E do `SPEC.md`).

### Tratamento de erro de banco

Se qualquer passo lançar `RuntimeError`/`ValueError` (ex.: `RETURNING` vazio), o router converte em
**HTTP 502 Bad Gateway** com a mensagem do erro. Erros de validação Pydantic já teriam barrado antes
(422).

## Pré-condições de banco (dependências do grupo de Banco)

Para este fluxo funcionar em runtime (não verificável só com `import`):
- `tb_avaliacoes.status` precisa de **default `'rascunho'`** e `data_avaliacao` default `now()` (o
  INSERT do back não os envia).
- A view `avaliacoes` precisa expor **`recomenda_exame`** ([[Decisões de Arquitetura (ADRs)|ADR-0005]]).
- `fn_calcular_score_triagem(avaliacao_id)` deve retornar
  `TABLE(score_final, limiar_usado, recomenda_exame, versao_param)`.

Lista completa na seção "Suposições sobre o banco" do `SPEC.md`.

## Arquivos envolvidos

| Arquivo | Papel |
|---------|-------|
| `presentation/api/v1/routers/anamnesis.py` | Endpoint, tradução schema→DTO, factory do use case |
| `presentation/api/v1/schemas/anamnesis.py` | `SubmitAnamnesisRequest`, `AvaliacaoResponse` |
| `application/dtos/anamnesis.py` | `SubmitAnamnesisDTO`, `ChecklistItemDTO`, `HistoricoFamiliarDTO` |
| `application/use_cases/submit_anamnesis.py` | Orquestração dos 7 passos |
| `domain/services/symptom_scoring_orchestrator.py` | Chama a função de score no banco |
| `interfaces/repositories/avaliacao_repository.py` | `create_rascunho`, `open_log_analise` |
| `interfaces/repositories/checklist_repository.py` | `insert_respostas` |
| `interfaces/repositories/historico_familiar_repository.py` | `add` |
| `interfaces/repositories/encaminhamento_repository.py` | `add` |
| `interfaces/repositories/audit_repository.py` | `registrar` (best-effort) |

## Relacionados
- [[Cálculo de Score de Triagem]] — a matemática por trás do `score_final`.
- [[Síndrome do X Frágil (SXF)]] — por que esses sintomas e esse limiar.
- [[Aplicação - Use Cases e DTOs]] · [[Interfaces - Repositórios e Dependências]]
- [[Decisões de Arquitetura (ADRs)|ADR-0004 e ADR-0005]]
