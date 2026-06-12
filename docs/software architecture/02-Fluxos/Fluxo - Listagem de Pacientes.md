---
title: Fluxo - Listagem de Pacientes
tags:
  - fluxo
  - leitura
  - pii
---

# Fluxo — Listagem e Detalhe de Pacientes

Como o médico lista seus pacientes (com resumo clínico) e abre o prontuário completo de um. Ilustra o
padrão **read repository** e a regra de **RBAC por `usuario_id`**.

## Endpoints

| Método | Rota | Retorno |
|--------|------|---------|
| GET | `/api/v1/pacientes?nome=&cpf=&limit=&offset=` | Lista paginada enriquecida |
| GET | `/api/v1/pacientes/{paciente_id}` | Detalhe completo (prontuário) |

Router: `presentation/api/v1/routers/patients.py`.

## Lista — `GET /pacientes`

```
GetPatientListUseCase.execute(usuario_id, nome_filter, cpf_raw_filter, limit, offset)
  • limit é capado em HARD_LIMIT = 200
  • se cpf_raw_filter: CPF(cpf).sha256_hex  ← o hash é feito NO USE CASE,
        o repositório nunca vê o CPF cru (regra testável sem banco)
  • PatientReadRepository.count_by_doctor(...) + list_by_doctor(...)
```

A query (`list_by_doctor`) junta, por paciente:
- dados básicos da view `pacientes` (nome **decifrado**, sexo, nascimento, `cpf_hash`),
- `telefone` do acompanhante (`LEFT JOIN acompanhantes`),
- a **última avaliação finalizada** (via `LEFT JOIN LATERAL` ordenado por `data_avaliacao DESC`):
  `ultimo_score`, `ultima_avaliacao`, `recomenda_exame` (status de risco).

> **RBAC:** o `WHERE p.criado_por = :usuario_id` garante que o médico só vê **seus** pacientes.
> Como os ids são sequenciais/adivinháveis ([[Decisões de Arquitetura (ADRs)|ADR-0003]]), esse filtro
> por dono é a defesa contra IDOR e deve estar em **toda** query nova.

### Mascaramento na borda

O `PatientListItem` (DTO interno) carrega `nome` **em claro** (decifrado pela view) e `cpf_hash`. O
router converte para `PatientListItemSchema` aplicando a máscara: `cpf_masked = CPF_MASK if cpf_hash
else None`. O nome da **lista**, porém, é repassado como veio (decifrado) no campo `nome` — o
mascaramento forte de nome (`mask_name`) é aplicado nos contextos onde o ADR-0002 exige; ver
[[Conformidade LGPD]] para a política exata por endpoint.

### Busca por nome é server-side

Como o nome pode estar mascarado no cliente, **filtrar no front não funciona**. A busca usa
`p.nome ILIKE :nome_filter` no servidor (a view decifra antes do `ILIKE`). O front usa
`?nome=...` com _debounce_ ([[Decisões de Arquitetura (ADRs)|ADR-0002]]).

## Detalhe — `GET /pacientes/{id}`

```
GetPatientDetailUseCase.execute(paciente_id, usuario_id)
  • PatientReadRepository.get_detail(paciente_id, usuario_id)
       WHERE p.id = :paciente_id AND p.criado_por = :usuario_id   ← RBAC
  • None  → router devolve HTTP 404 "Paciente não encontrado"
```

Devolve o registro clínico completo (`PatientDetailResponse`): demografia, comorbidades,
`idade_anos` (calculada pela view), `diagnostico_confirmado_fxs` e a lista de `acompanhantes`
(com `relacao`/telefone/email). O CPF sai mascarado; o nome do paciente sai **em claro para o médico
dono** (o detalhe é mais permissivo que a lista, por ser do prontuário).

## Por que dois repositórios para "paciente"?

| Repositório | Uso | Estilo |
|-------------|-----|--------|
| `PatientRepository` | **escrita** + lookup por id/cpf (devolve a entidade `Patient`) | mapeia para o domínio |
| `PatientReadRepository` | **leitura** de listas/detalhe (devolve DTOs achatados `PatientListItem`/`PatientDetail`) | otimizado para a tela |

É uma separação **CQRS-lite**: o caminho de escrita usa entidades ricas; o de leitura usa _read
models_ (dataclasses) montados sob medida para a UI, evitando carregar a entidade inteira só para
exibir uma tabela.

## Arquivos envolvidos

| Arquivo | Papel |
|---------|-------|
| `presentation/api/v1/routers/patients.py` | `list_patients`, `get_patient_detail` |
| `presentation/api/v1/schemas/patient.py` | `PatientListResponse`, `PatientDetailResponse` |
| `application/use_cases/get_patient_list.py` | Hash de CPF + paginação + HARD_LIMIT |
| `application/use_cases/get_patient_detail.py` | Delega ao read repo (None → 404) |
| `interfaces/repositories/patient_read_repository.py` | Queries de lista e detalhe (JOIN LATERAL) |
| `presentation/api/v1/masking.py` | `CPF_MASK`, `mask_name` |

## Relacionados
- [[Fluxo - Cadastro de Paciente]] — como o paciente entrou.
- [[Fluxo - Dashboard e Histórico]] — outros read models.
- [[Conformidade LGPD]] — política de mascaramento.
