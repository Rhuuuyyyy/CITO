---
title: Domínio - Entidades e Value Objects
tags:
  - camada/dominio
  - referencia
---

# Domínio — Entidades, Value Objects e Serviços

A camada `domain/` é o **núcleo puro**: só depende de stdlib + Pydantic. Aqui ficam os conceitos do
negócio e suas invariantes. Parte do conteúdo é **legado não conectado** — esta página marca
claramente o que é real. Ver [[Núcleo Ativo vs Scaffolding Legado]].

---

## Entidades ATIVAS

### `Patient` (`domain/entities/patient.py`)

Pessoa registrada para avaliação de SXF. Modelo Pydantic com `extra="forbid"` e
`validate_assignment=True`.

- **Identidade:** `id: int | None` — `None` até o repositório persistir e preencher o SERIAL do banco
  ([[Decisões de Arquitetura (ADRs)|ADR-0003]]).
- **Obrigatórios:** `full_name` (2–120), `birth_date`, `sex_at_birth`, `criado_por_db_id` (FK
  usuarios.id, ≥1).
- **Opcionais (demografia):** `cpf` (value object), `etnia`, `uf_nascimento`,
  `municipio_residencia`, `uf_residencia`, `prematuro`, `idade_gestacional_semanas`,
  `peso_nascimento_gramas`, `escolaridade`, `tem_diagnostico_autismo`, `tem_diagnostico_tdah`,
  `outras_comorbidades`, `medicamentos_uso`, `acompanhante_id`, `grau_parentesco`,
  `diagnostico_confirmado_fxs`.
- **Comportamento:** `cpf_hash` (property → `sha256_hex` do CPF) e `age_at(reference)` (idade exata).
- **Enums:** `SexAtBirth` (M/F/I), `Etnia` (branca/preta/parda/amarela/indigena/nao_declarado),
  `Escolaridade` (10 níveis).

Usada em [[Fluxo - Cadastro de Paciente]].

### `Acompanhante` (`domain/entities/acompanhante.py`)

Responsável/cuidador. Campos: `id: int | None`, `nome` (2–120), `cpf` (VO opcional), `telefone`,
`email`. Property `cpf_hash`. Deduplicado por CPF no cadastro.

---

## Value Object: `CPF` (`domain/value_objects/cpf.py`)

O exemplo mais didático de **value object** do projeto. `@dataclass(frozen=True)` (imutável).

```python
@dataclass(frozen=True)
class CPF:
    value: str
    def __post_init__(self):
        cleaned = re.sub(r"[.\-\s]", "", self.value)   # tira pontos, traços, espaços
        if not cleaned.isdigit() or len(cleaned) != 11:
            raise ValueError("CPF inválido: deve conter exatamente 11 dígitos numéricos")
        object.__setattr__(self, "value", cleaned)     # "fura" o frozen só p/ normalizar
    @property
    def sha256_hex(self) -> str: ...                   # hash one-way para lookup
    def __repr__(self): return "CPF(***redacted***)"   # NUNCA vaza o número
    def __str__(self):  return "***redacted***"
```

- **Valida na construção:** impossível existir um `CPF` inválido (11 dígitos).
- **Hash, não armazenamento:** só `sha256_hex` é persistido (`cpf_hash`) — ver [[Conformidade LGPD]].
- **Anti-vazamento:** `__repr__`/`__str__` redatam — o CPF não aparece em log nem em traceback.
- **`CPFAnnotated`**: `Annotated[CPF, BeforeValidator(...)]` para uso transparente como tipo de campo
  Pydantic (aceita `str` ou `CPF`). É o que `Patient.cpf`/`Acompanhante.cpf` usam.

---

## Serviço de domínio: `SymptomScoringOrchestrator`

`domain/services/symptom_scoring_orchestrator.py`. Apesar de "viver" no domínio, é uma **ponte fina
para o banco**: seu único método `execute_scoring(avaliacao_id, session)` roda
`SELECT * FROM fn_calcular_score_triagem(:id)` e devolve um `ScoringResult(score_final, limiar_usado,
recomenda_exame, versao_param)`.

> A regra de score **não** está em Python — está na função do banco. Este serviço só a invoca e tipa o
> retorno. Ver [[Cálculo de Score de Triagem]] e [[Fluxo - Submissão de Anamnese]].

---

## LEGADO — entidades e ports NÃO conectados

> Estes existem mas **nenhum use case/router ativo** os usa. São scaffolding do back-end antigo
> (modelo UUID). Detalhe e justificativa em [[Núcleo Ativo vs Scaffolding Legado]].

| Arquivo | Conteúdo órfão |
|---------|----------------|
| `domain/entities/evaluation.py` | `Evaluation`, `ScoreBand`, `Recommendation` (UUID) |
| `domain/entities/checklist_response.py` | `ChecklistResponse`, `ChecklistItem` (UUID) |
| `domain/entities/symptom.py` | `SymptomCategory`, `AgeRelevance` (a classe `Symptom` nem é definida) |
| `domain/entities/user.py` | `User`, `UserRole` (a identidade real é `AuthenticatedDoctor`) |
| `domain/ports/*.py` | Protocols `IPatientRepository`, `IEvaluationRepository`, `IChecklistResponseRepository`, `ISymptomRepository`, `IUserRepository` |

> Confusão comum: o `Patient`/`Acompanhante` reais usam **`int`**; as entidades órfãs usam
> **`UUID`**. Se você vir `id: UUID` num arquivo de domínio, é legado.

## Relacionados
- [[Fluxo - Cadastro de Paciente]] — `Patient`/`Acompanhante`/`CPF` em ação.
- [[Cálculo de Score de Triagem]] — o que o orchestrator dispara.
- [[Aplicação - Use Cases e DTOs]] — quem consome o domínio.
- [[Núcleo Ativo vs Scaffolding Legado]] — o mapa ativo vs. legado.
