# 0005 — Dependência do contrato `avaliacoes.recomenda_exame` (grupo de banco)

- **Status:** Aceito
- **Data:** 2026-06-08
- **Decisores:** engenharia de integração (requer ação do grupo de Banco)

## Contexto

Vários pontos do Back-End precisam saber se uma avaliação **recomenda exame** (encaminhamento):

- `dashboard.get_summary` → `taxa_recomendacao_exame`;
- `avaliacao_read_repository` (histórico do paciente) → `recomenda_exame` por avaliação;
- lista enriquecida de pacientes → status de risco (`recomenda_exame`).

A regra é: `score_final >= limiar(sexo)` (♂ 0.56 · ♀ 0.55), possivelmente suprimida por diagnóstico
prévio confirmado. Essa lógica vive no banco (função de score) e o resultado pode ser materializado.

## Decisão

O Back-End **lê `recomenda_exame` da view `avaliacoes`** em vez de recomputar a regra em Python.
Consequentemente, **a view `avaliacoes` precisa expor a coluna `recomenda_exame` (BOOLEAN)** — esta
é uma **dependência explícita do grupo de Banco** e está registrada na [`SPEC.md`](../../SPEC.md).

Exceção: o endpoint `GET /relatorios/avaliacoes` **não** depende dessa coluna — ele devolve
`score_final` + `sexo` e o front computa `encaminha` para os gráficos. Isso evita a dependência onde
ela não é estritamente necessária.

## Consequências

**Positivas**
- Sem duplicação da regra de negócio; o banco continua a fonte de verdade do score/limiar.

**Negativas / risco**
- Se a view não tiver a coluna, os endpoints de dashboard/histórico **falham em runtime** (não no
  import test, que não toca o banco). É o item nº 1 da checklist de validação E2E do usuário.

## Ação requerida (grupo de Banco)

Garantir que `SELECT recomenda_exame FROM avaliacoes` funcione (coluna ou expressão na view). Apagar
os dados legados com nomes em hex UTF-8 incompatíveis com o PGP (autorizado pelo dono do projeto;
sem script de migração, ambiente acadêmico).

## Relacionados

[[0004]] (submissão consolidada que grava o encaminhamento), [[0001]] (API única).
