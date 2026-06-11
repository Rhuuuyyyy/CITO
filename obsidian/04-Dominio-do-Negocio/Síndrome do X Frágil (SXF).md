---
title: Síndrome do X Frágil (SXF)
tags:
  - dominio
  - clinico
  - contexto
---

# Síndrome do X Frágil (SXF / FXS)

Contexto clínico **mínimo** para entender por que o sistema existe e por que o código tem as regras
que tem. Não é material médico — é o suficiente para um(a) dev fazer escolhas informadas.

## O que é

A **Síndrome do X Frágil** (SXF; em inglês _Fragile X Syndrome_, FXS) é a causa hereditária mais comum
de **deficiência intelectual** e a causa monogênica mais comum de **autismo**. Decorre de uma mutação
no gene **FMR1** (no cromossomo X). O diagnóstico **definitivo** é **molecular/genético** (teste do
FMR1) — o CITO **não** diagnostica; ele faz **pré-diagnóstico/triagem** para indicar **quem deve fazer
o teste genético**.

> Por isso o desfecho central do sistema é `recomenda_exame` (encaminhar para o **exame FMR1**), não
> um "diagnóstico". Ver [[Fluxo - Submissão de Anamnese]].

## Como o sistema modela a triagem

1. **Catálogo de 12 sintomas** (tabela `sintomas`), cada um com um **peso** calibrado
   cientificamente — e **pesos diferentes para M e F**, porque a síndrome se manifesta de forma
   distinta entre sexos.
2. O médico marca, no checklist, quais sintomas estão **presentes** no paciente
   (`respostas_checklist`).
3. Coleta-se o **histórico familiar** (achados hereditários ligados ao FXS) uma vez por avaliação
   (`tb_historico_familiar`).
4. O **score** é a soma dos pesos dos sintomas presentes (pelo sexo do paciente). Ver
   [[Cálculo de Score de Triagem]].
5. Compara-se o score com um **limiar** por sexo (`parametro_triagem`). Acima do limiar →
   **recomenda exame**.

## Os 12 sintomas e seus pesos (do banco)

| # | Sintoma | Peso M | Peso F | Exclusivo M |
|---|---------|:------:|:------:|:-----------:|
| 1 | Deficiência intelectual | 0.32 | 0.20 | — |
| 2 | Face alongada / orelhas salientes | 0.29 | 0.09 | — |
| 3 | Macroorquidismo | 0.26 | — | **Sim** |
| 4 | Hipermobilidade articular | 0.19 | 0.04 | — |
| 5 | Dificuldades de aprendizagem | 0.18 | 0.28 | — |
| 6 | Déficit de atenção | 0.17 | 0.12 | — |
| 7 | Movimentos repetitivos (estereotipias) | 0.17 | 0.05 | — |
| 8 | Atraso na fala | 0.14 | 0.01 | — |
| 9 | Hiperatividade | 0.12 | 0.04 | — |
| 10 | Evita contato visual | 0.06 | 0.08 | — |
| 11 | Evita contato físico | 0.04 | 0.07 | — |
| 12 | Agressividade | 0.01 | 0.02 | — |

> **Macroorquidismo** (aumento testicular) é exclusivamente masculino → sem peso feminino. Note que
> alguns sintomas pesam **mais em mulheres** (ex.: "dificuldades de aprendizagem": 0.28 F vs. 0.18 M),
> refletindo a apresentação clínica distinta.

## Achados de histórico familiar coletados

Booleanos em `tb_historico_familiar` / `HistoricoFamiliarDTO`: deficiência intelectual,
falência ovariana precoce, autismo na família, epilepsia, infertilidade masculina, menopausa precoce,
abortos recorrentes, tremor/ataxia familiar (+ `descricao_outros`). Estes refletem condições do
**espectro FMR1** em familiares (ex.: FXTAS — tremor/ataxia; FXPOI — falência ovariana), relevantes
para o risco hereditário.

## Limiares vigentes (`parametro_triagem`)

| Sexo | Limiar | AUC | Sensibilidade | Versão |
|------|:------:|:---:|:-------------:|--------|
| M | **0.56** | 0.73 | 95% | `ROMERO_2025_v1_M` |
| F | **0.55** | 0.76 | 95% | `ROMERO_2025_v1_F` |

Esses valores vêm de um modelo científico (referência bibliográfica guardada no banco). Mantê-los **no
banco** permite recalibrar sem mexer no código. Ver [[Cálculo de Score de Triagem]].

## Glossário rápido do domínio

| Termo | Significado |
|-------|-------------|
| FMR1 | Gene cuja mutação causa a SXF; alvo do exame genético recomendado |
| Triagem / anamnese | Coleta de sintomas + histórico que alimenta o score |
| Encaminhamento `exame_fmr1` | Recomendação automática de teste genético quando o score passa do limiar |
| `diagnostico_previo_fxs` | Paciente já tem diagnóstico molecular → suprime nova recomendação |
| Limiar (`limiar_score`) | Corte por sexo que decide `recomenda_exame` |

## Relacionados
- [[Cálculo de Score de Triagem]] — a matemática e o fluxo do score.
- [[Fluxo - Submissão de Anamnese]] — onde a triagem é processada.
- [[Modelo de Dados (Banco)]] — `sintomas`, `parametro_triagem`, `tb_historico_familiar`.
