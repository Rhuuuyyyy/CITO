---
title: Glossário
tags:
  - referencia
  - glossario
---

# Glossário

Termos do domínio, da arquitetura e do código. Em **PT** e **EN** quando relevante (o código mistura
os dois: domínio em inglês, banco/negócio em português).

## Domínio clínico

| Termo | Significado |
|-------|-------------|
| **SXF / FXS** | Síndrome do X Frágil / _Fragile X Syndrome_. O domínio do sistema. Ver [[Síndrome do X Frágil (SXF)]]. |
| **FMR1** | Gene cuja mutação causa a SXF; alvo do exame genético recomendado. |
| **Triagem / Anamnese** | Coleta de sintomas + histórico familiar que alimenta o score. |
| **Score (`score_final`)** | Soma ponderada dos sintomas presentes, por sexo. Ver [[Cálculo de Score de Triagem]]. |
| **Limiar (`limiar_score`)** | Corte por sexo (M 0.56 / F 0.55) que decide `recomenda_exame`. |
| **`recomenda_exame`** | Booleano: o sistema sugere o exame FMR1. Calculado na view `avaliacoes`. |
| **`diagnostico_previo_fxs`** | Paciente já tem diagnóstico molecular → suprime nova recomendação (score ainda calcula). |
| **Encaminhamento** | Indicação a especialidade/exame (`tb_encaminhamentos`); `exame_fmr1` é o automático. |
| **Acompanhante** | Responsável/cuidador do paciente (mãe, pai…). `relacao` → `grau_parentesco`. |
| **Histórico familiar** | Achados hereditários ligados ao FXS (1 registro por avaliação). |

## Arquitetura / código

| Termo | Significado |
|-------|-------------|
| **Hexagonal / Ports & Adapters** | Padrão que isola o domínio das tecnologias. Ver [[Arquitetura Hexagonal (Ports & Adapters)]]. |
| **Composition Root** | Único lugar que conhece todas as camadas: `app/main.py`. Ver [[Composition Root (main.py)]]. |
| **Use Case** | Classe que orquestra uma operação de negócio (`execute()`). [[Aplicação - Use Cases e DTOs]]. |
| **DTO** | _Data Transfer Object_; desacopla use case dos schemas HTTP. |
| **Entidade** | Objeto de domínio com identidade (`Patient`, `Acompanhante`). |
| **Value Object** | Objeto sem identidade, definido pelo valor e imutável (`CPF`). |
| **Repository / Adapter** | Implementação de persistência (SQL nas views). [[Interfaces - Repositórios e Dependências]]. |
| **Port (Protocol)** | Contrato/interface. No CITO, os de `domain/ports/` estão **órfãos** ([[Núcleo Ativo vs Scaffolding Legado]]). |
| **Read model** | Dataclass achatada para leitura (CQRS-lite), ex.: `PatientListItem`. |
| **Schema (Pydantic)** | Contrato HTTP de request/response (`extra="forbid"`). |
| **Masking** | Mascaramento de PII na borda (`mask_name`, `CPF_MASK`). [[Conformidade LGPD]]. |
| **Unit of Work** | A `AsyncSession` por requisição (commit/rollback). [[Core - Configuração, Segurança e Exceções]]. |
| **Scaffolding legado** | Código do back antigo não conectado (entidades UUID, ports). [[Núcleo Ativo vs Scaffolding Legado]]. |

## Segurança / LGPD

| Termo | Significado |
|-------|-------------|
| **LGPD** | Lei Geral de Proteção de Dados (Brasil). Ver [[Conformidade LGPD]]. |
| **PII** | _Personally Identifiable Information_ — dados pessoais (nome, CPF). |
| **JWT (HS256)** | Token assinado que carrega `usuario_id`/`role`/`sessao_id`. [[Core - Configuração, Segurança e Exceções]]. |
| **`pgp_key`** | Chave de cifragem das views, injetada por sessão (nunca no banco). |
| **`cpf_hash`** | SHA-256 do CPF; o número nunca é armazenado. |
| **k-anonimato** | Suprimir grupos com < 5 para evitar reidentificação (Art. 12). |
| **RBAC** | Controle de acesso por papel; no app, escopo por `usuario_id` (médico dono). |
| **IDOR** | _Insecure Direct Object Reference_; mitigado pelo filtro por dono ([[Decisões de Arquitetura (ADRs)|ADR-0003]]). |
| **Brute-force guard** | ≥5 falhas/10min por IP → HTTP 429. |
| **Best-effort (auditoria)** | Operação que, se falhar, não derruba o fluxo (SAVEPOINT + try/except). |

## Banco / infraestrutura

| Termo | Significado |
|-------|-------------|
| **View lógica** | `pacientes`/`acompanhantes`/`avaliacoes`; decifram e são a única interface do back. |
| **Trigger `INSTEAD OF INSERT`** | Cifra o nome ao inserir na view. |
| **`vw_dashboard_anonimizado`** | View materializada de BI, sem PII. |
| **`pgcrypto` / `pg_trgm`** | Extensões: cifragem/hash · busca por similaridade. |
| **asyncpg** | Driver PostgreSQL assíncrono usado pelo SQLAlchemy. |
| **Lazy connect** | O banco só conecta no 1º uso → `import app.main` roda sem DB. |

## Siglas rápidas

`ADR` decisão de arquitetura · `MOC` mapa de conteúdo (índice) · `CQRS` separação leitura/escrita ·
`DI` injeção de dependências · `VO` value object · `UoW` unit of work · `E2E` teste ponta a ponta.

## Relacionados
- [[Início]] · [[Visão Geral da Arquitetura]] · [[Decisões de Arquitetura (ADRs)]]
