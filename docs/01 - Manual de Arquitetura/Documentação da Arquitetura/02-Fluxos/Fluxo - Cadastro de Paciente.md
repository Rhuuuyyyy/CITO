---
title: Fluxo - Cadastro de Paciente
tags:
  - fluxo
  - clinico
  - pii
---

# Fluxo — Cadastro de Paciente

Como um novo paciente (e seu acompanhante/responsável) é registrado. É o fluxo que **mais lida com
PII**, então atenção à cifragem (banco) e ao mascaramento (API).

## Endpoint

`POST /api/v1/pacientes` · autenticado · status 201 · router
`presentation/api/v1/routers/patients.py`.

### Payload — `PatientCreateRequest`

Só `nome`, `data_nascimento` e `sexo` são obrigatórios. O bloco `acompanhante` é opcional, mas se
presente exige `nome` e `relacao`. Campos demográficos (etnia, UF, escolaridade, comorbidades…) são
todos opcionais — o banco permite NULL ([[Decisões de Arquitetura (ADRs)|ADR registrado no SPEC]]).

```json
{
  "nome": "Maria Aparecida Silva",
  "cpf": "12345678901",
  "data_nascimento": "2015-03-02",
  "sexo": "M",
  "etnia": "parda",
  "acompanhante": { "nome": "Joana Silva", "relacao": "Mãe", "telefone": "11999999999" }
}
```

### Resposta — `PatientResponse` (PII mascarada)

```json
{ "id": 12, "nome_masked": "Maria A*** S***", "sexo": "M",
  "etnia": "parda", "uf_residencia": null, "criado_por_db_id": 7 }
```

## Passo a passo

```
┌─ routers/patients.py — register_patient() ────────────────────────────────┐
│ get_current_doctor() → doctor.usuario_id                                  │
│ RegisterPatientUseCase.execute(request, usuario_db_id=doctor.usuario_id)  │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    ▼
┌─ application/use_cases/register_patient.py ───────────────────────────────┐
│ Step 1 — Resolver acompanhante (se enviado):                              │
│   • monta CPF (value object) se houver                                    │
│   • AcompanhanteRepository.get_by_cpf() → já existe?                       │
│       não → AcompanhanteRepository.add(Acompanhante(...)) → novo id        │
│       sim → reusa o id existente                                          │
│   • grau_parentesco = acompanhante.relacao  (guardado NO PACIENTE)        │
│ Step 2 — Construir a entidade Patient (domínio) e persistir:              │
│   • CPF(request.cpf) valida 11 dígitos; SexAtBirth/Etnia/Escolaridade     │
│     traduzem strings → enums                                              │
│   • PatientRepository.add(patient) → INSERT pacientes RETURNING id        │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    ▼
            Patient com id preenchido → PatientResponse (nome mascarado)
```

## Pontos que pegam gente desprevenida

### O nome é cifrado pelo BANCO, no INSERT da view

O repositório faz `INSERT INTO pacientes (nome, ...)` com o nome **em claro**. A view `pacientes` tem
um trigger `INSTEAD OF INSERT` (`fn_pacientes_insert`) que aplica `pgp_sym_encrypt(NEW.nome, pgp_key)`
e grava em `tb_pacientes.nome_criptografado`. O Python nunca cifra nada — ver
[[Conformidade LGPD]] e `scripts/sql/2026-06-09_p1_write_triggers.sql`.

### O CPF nunca é gravado — só o hash

O value object `CPF` ([[Domínio - Entidades e Value Objects|cpf.py]]) expõe `sha256_hex`. O repositório
grava `cpf_hash`, não o número. Isso permite **lookup por igualdade** (achar duplicado) sem armazenar
o CPF. O `CPF.__repr__`/`__str__` retornam `***redacted***` — ele **nunca** vaza em log.

### `relacao` do acompanhante vira `grau_parentesco` do paciente

O grau de parentesco ("Mãe", "Pai"…) é enviado **dentro** do bloco `acompanhante` (`relacao`) mas é
armazenado **na coluna do paciente** (`grau_parentesco`), não no acompanhante. Modelagem do banco.

### Acompanhante é deduplicado por CPF

Se o acompanhante já existe (mesmo `cpf_hash`), ele é **reaproveitado** (um responsável pode cuidar de
vários pacientes). Sem CPF, sempre cria um novo.

### Identidade é `int`, não UUID

A entidade `Patient` nasce com `id=None` e recebe o `id` SERIAL do banco via
`model_copy(update={"id": ...})` após o `RETURNING id`. Decisão em
[[Decisões de Arquitetura (ADRs)|ADR-0003]].

### A resposta mascara o nome — mas no cadastro novo o front ainda tem o nome real

`PatientResponse.nome_masked` vem mascarado. No entanto, no fluxo de **paciente novo**, o front ainda
tem o nome digitado na memória do formulário (útil p/ um laudo imediato). Para paciente **já
existente**, a API nunca devolve nome em claro — limitação consciente ([[Decisões de Arquitetura (ADRs)|ADR-0002]]).

## Arquivos envolvidos

| Arquivo | Papel |
|---------|-------|
| `presentation/api/v1/routers/patients.py` | Endpoint `register_patient` |
| `presentation/api/v1/schemas/patient.py` | `PatientCreateRequest`, `AcompanhanteCreateRequest`, `PatientResponse` |
| `application/use_cases/register_patient.py` | Orquestração (acompanhante + paciente) |
| `domain/entities/patient.py` | Entidade `Patient` + enums `SexAtBirth`/`Etnia`/`Escolaridade` |
| `domain/entities/acompanhante.py` | Entidade `Acompanhante` |
| `domain/value_objects/cpf.py` | Value object `CPF` (hash, redacted) |
| `interfaces/repositories/patient_repository.py` | INSERT/SELECT na view `pacientes` |
| `interfaces/repositories/acompanhante_repository.py` | INSERT/SELECT na view `acompanhantes` |

## Relacionados
- [[Fluxo - Listagem de Pacientes]] — como esse paciente reaparece, enriquecido.
- [[Conformidade LGPD]] · [[Modelo de Dados (Banco)]]
- [[Domínio - Entidades e Value Objects]]
