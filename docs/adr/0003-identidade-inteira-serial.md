# 0003 — Identidade inteira (SERIAL) para Paciente e Acompanhante

- **Status:** Aceito
- **Data:** 2026-06-08
- **Decisores:** engenharia de integração

## Contexto

O Back-End antigo modelava `Patient`/`Acompanhante` com **UUID** (campos `id: UUID`, `db_id`) e
gerava o id na aplicação. O banco real (alinhado ao Front-End) usa **`SERIAL`/`INTEGER`
auto-incrementado** como chave primária (`id`), e as views/triggers assumem inteiros. Tentar
inserir um UUID num PK inteiro quebraria o cadastro — esse mismatch era um bloqueador silencioso
não documentado no plano original.

## Decisão

Adotar **identidade inteira** ponta a ponta para Paciente e Acompanhante, espelhando o banco:

- Entidades de domínio: `id: int | None = None` (sem UUID, sem `db_id`).
- Repositórios: `INSERT` **sem** coluna id, com `RETURNING id`; o id volta do banco e é fixado na
  entidade via `model_copy(update={"id": ...})`.
- `acompanhante_id` é `int`. Schemas de request/response e o front usam `int`.

## Consequências

**Positivas**
- O cadastro volta a funcionar contra o esquema real; nada de geração de id na aplicação.
- Menos código (sem mapear UUID↔serial).

**Negativas**
- Ids inteiros são adivinháveis/enumeráveis. Mitigado porque toda rota exige JWT e é escopada ao
  médico dono; ainda assim, IDOR deve ser checado em qualquer rota nova (sempre filtrar por
  `usuario_id` do token).

## Notas

Decisão tomada após **verificar o código real contra o plano** — o plano de integração presumia o
modelo do back; a inspeção do banco (`docs/database_report.md`) mostrou `SERIAL`. Regra do
workbench: "entender antes de mudar".
