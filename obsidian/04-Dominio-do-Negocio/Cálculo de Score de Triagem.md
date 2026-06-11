---
title: Cálculo de Score de Triagem
tags:
  - dominio
  - clinico
  - score
  - banco
---

# Cálculo de Score de Triagem

A regra mais importante do negócio — e uma que **vive no banco de dados**, não no Python. Entender
isto evita o erro clássico de procurar a fórmula no back-end.

## Onde a lógica mora

> O score é calculado pela função PostgreSQL **`fn_calcular_score_triagem(avaliacao_id)`**. O
> back-end **não duplica** a fórmula — ele apenas a invoca e lê o resultado. Decisão registrada em
> [[Decisões de Arquitetura (ADRs)|ADR-0005]] e no `SPEC.md` ("score via fn_calcular_score_triagem —
> lógica no banco").

O único código Python envolvido é o [[Domínio - Entidades e Value Objects|SymptomScoringOrchestrator]]:

```python
async def execute_scoring(self, avaliacao_id, session) -> ScoringResult:
    result = await session.execute(
        text("SELECT * FROM fn_calcular_score_triagem(:avaliacao_id)"),
        {"avaliacao_id": avaliacao_id})
    row = result.mappings().first()
    return ScoringResult(row["score_final"], row["limiar_usado"],
                         row["recomenda_exame"], row["versao_param"])
```

## A fórmula (conceitual)

```
score_final = Σ  peso(sintoma, sexo_do_paciente)   para cada sintoma marcado "presente"

recomenda_exame =
    NULL                      se score_final ainda é NULL (não finalizada)
    false                     se diagnostico_previo_fxs = true
    score_final >= limiar(sexo)   caso contrário     (M: 0.56 · F: 0.55)
```

- Os **pesos** vêm da tabela `sintomas` (`peso` para M, `peso_feminino` para F). Ver os 12 sintomas em
  [[Síndrome do X Frágil (SXF)]].
- O **limiar** vem de `parametro_triagem` (linha `ativo` do sexo do paciente).
- O **sexo do paciente** seleciona qual peso e qual limiar usar.

## O que `fn_calcular_score_triagem` faz (efeitos colaterais)

Segundo `docs/database_report.md`, a função é "o coração da triagem" e numa **única chamada atômica**:

1. lê as respostas do checklist da avaliação;
2. multiplica/soma os pesos pelo sexo → `score_final`;
3. compara com o `limiar_score` vigente;
4. **grava a análise** em `tb_log_analises` (score em claro, para auditoria do modelo);
5. **atualiza `tb_avaliacoes`**: `score_final` preenchido, `status → 'finalizada'`;
6. retorna `TABLE(score_final, limiar_usado, recomenda_exame, versao_param)`.

> Por isso, no [[Fluxo - Submissão de Anamnese]], o use case **não** seta `status='finalizada'` à mão —
> a função do banco faz isso. O back só cria o rascunho, grava respostas/histórico e chama a função.

## Onde `recomenda_exame` é lido depois

O resultado do score é materializado/calculado na **view `avaliacoes`** (coluna calculada
`recomenda_exame`), consumida por:
- a **lista enriquecida** de pacientes (status de risco) — [[Fluxo - Listagem de Pacientes]];
- o **histórico** do paciente — [[Fluxo - Dashboard e Histórico]];
- o **summary** do dashboard (`taxa_recomendacao_exame`) — [[Fluxo - Dashboard e Histórico]].

 Dependência crítica: se a view não expuser `recomenda_exame`, esses pontos **falham em runtime**.
É o item nº 1 da checklist E2E ([[Decisões de Arquitetura (ADRs)|ADR-0005]]). A view a calcula assim
(de `scripts/sql/2026-06-09_p0_views.sql`):

```sql
CASE
  WHEN a.score_final IS NULL        THEN NULL
  WHEN a.diagnostico_previo_fxs     THEN false
  WHEN a.score_final >= (SELECT limiar_score FROM parametro_triagem
                          WHERE ativo AND sexo = <sexo do paciente>) THEN true
  ELSE false
END AS recomenda_exame
```

## A exceção: o relatório NÃO depende de `recomenda_exame`

`GetRelatorioAvaliacoesUseCase` / `RelatorioRepository` devolvem `score_final` + `sexo` e deixam o
**front computar** `encaminha` para os gráficos. Isso evita a dependência da coluna onde ela não é
estritamente necessária — decisão fina do [[Decisões de Arquitetura (ADRs)|ADR-0005]].

## Por que manter a regra no banco

| Vantagem | Detalhe |
|----------|---------|
| Fonte única da verdade | Front (preview), back e relatórios concordam com o banco |
| Recalibração sem deploy | Mudar pesos/limiares = `UPDATE` em `sintomas`/`parametro_triagem` |
| Auditabilidade | `tb_log_analises` guarda score + versão do parâmetro usados |
| Atomicidade | Cálculo + finalização + log numa transação só |

> Nota histórica: na versão antiga (Supabase direto), o **front** reimplementava essa regra, divergindo
> do back. A consolidação ([[Decisões de Arquitetura (ADRs)|ADR-0001/0004]]) tirou a regra do cliente.
> Hoje o front ainda calcula um score **só para preview** na tela de revisão; o valor que vale é o que
> o back devolve.

## Relacionados
- [[Fluxo - Submissão de Anamnese]] — o passo 5 dispara este cálculo.
- [[Síndrome do X Frágil (SXF)]] — pesos e limiares e seu significado.
- [[Modelo de Dados (Banco)]] — `sintomas`, `parametro_triagem`, view `avaliacoes`.
