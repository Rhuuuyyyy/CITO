---
title: CITO — Documentação de Arquitetura (Back-end)
tags:
  - moc
  - cito
  - indice
created: 2026-06-11
---

# CITO — Documentação do Back-end

> **CITO** é uma ferramenta de **pré-diagnóstico da Síndrome do X Frágil (SXF/FXS)** para uso
> clínico: cadastro de pacientes, triagem por checklist com escore validado cientificamente,
> encaminhamento automático para teste genético (FMR1), agenda e relatórios — tudo em conformidade
> com a **LGPD** (PII cifrada no banco e mascarada na API).

Este cofre Obsidian documenta o **back-end** (`app/`): uma API **FastAPI** desenhada em
**arquitetura hexagonal** (ports & adapters), que conversa com um **PostgreSQL + pgcrypto** apenas
através de _views_ lógicas que cifram/decifram dados sensíveis de forma transparente.

Se você é novo no projeto, **siga a trilha de leitura abaixo na ordem**.

---

## Trilha de leitura recomendada

1. [[Visão Geral da Arquitetura]] — o mapa mental de tudo em 5 minutos.
2. [[As Quatro Camadas]] — como o código está organizado e por quê.
3. [[Núcleo Ativo vs Scaffolding Legado]] — **leia antes de mexer no código**: nem todo arquivo está em uso.
4. [[Fluxo - Submissão de Anamnese]] — o coração clínico do sistema, ponta a ponta.
5. [[Síndrome do X Frágil (SXF)]] — o domínio do problema que o sistema resolve.

---

## Mapas de Conteúdo (MOCs)

### Arquitetura — _como o sistema é construído_
- [[Visão Geral da Arquitetura]]
- [[As Quatro Camadas]]
- [[Arquitetura Hexagonal (Ports & Adapters)]]
- [[Núcleo Ativo vs Scaffolding Legado]]
- [[Composition Root (main.py)]]

### Fluxos de Execução — _o que acontece em cada requisição_
- [[Fluxo - Login e Sessão]]
- [[Fluxo - Cadastro de Paciente]]
- [[Fluxo - Submissão de Anamnese]]
- [[Fluxo - Listagem de Pacientes]]
- [[Fluxo - Dashboard e Histórico]]

### Componentes — _referência módulo a módulo_
- [[Core - Configuração, Segurança e Exceções]]
- [[Domínio - Entidades e Value Objects]]
- [[Aplicação - Use Cases e DTOs]]
- [[Interfaces - Repositórios e Dependências]]
- [[Apresentação - Routers, Schemas e Masking]]

### Domínio do Negócio — _as regras clínicas e legais_
- [[Síndrome do X Frágil (SXF)]]
- [[Cálculo de Score de Triagem]]
- [[Conformidade LGPD]]
- [[Modelo de Dados (Banco)]]

### Referência — _consulta rápida_
- [[Contrato de API (Endpoints)]]
- [[Glossário]]
- [[Decisões de Arquitetura (ADRs)]]

### Diagramas Visuais (Canvas)
- [[Topologia do Sistema.canvas| Topologia do Sistema]]
- [[Mapa de Camadas.canvas| Mapa de Camadas]]
- [[Fluxo de Submissão de Anamnese.canvas| Fluxo de Submissão de Anamnese]]
- [[Modelo de Dados.canvas| Modelo de Dados]]

---

## Visão relâmpago (TL;DR)

| Pergunta | Resposta curta |
|----------|----------------|
| **O que é?** | API de triagem para Síndrome do X Frágil. |
| **Stack?** | FastAPI + SQLAlchemy async + asyncpg + Pydantic v2 + PostgreSQL/pgcrypto. |
| **Arquitetura?** | Hexagonal (ports & adapters) em 4 camadas: `presentation → application → domain ← interfaces`. |
| **Como o front conversa?** | _Exclusivamente_ via API HTTPS/JSON com Bearer JWT (sem acesso direto ao banco — [[Decisões de Arquitetura (ADRs)\|ADR-0001]]). |
| **Onde fica a regra de score?** | **No banco** (`fn_calcular_score_triagem`), não no Python — ver [[Cálculo de Score de Triagem]]. |
| **Como a PII é protegida?** | Cifrada no banco (pgcrypto), mascarada na borda da API ([[Conformidade LGPD]]). |
| **Identidade das entidades?** | `int` SERIAL do banco, não UUID ([[Decisões de Arquitetura (ADRs)\|ADR-0003]]). |
| **Ponto de entrada?** | `app/main.py` → [[Composition Root (main.py)]]. |
| **Como subir?** | `python run.py` (cria venv, instala deps, sobe API:8000 + front:5500). |

---

## Fontes da verdade no repositório

Esta documentação **interpreta e organiza** os artefatos abaixo; em caso de divergência, o código e
estes arquivos prevalecem:

- `README.md` — instruções de execução.
- `SPEC.md` — fonte da verdade da **integração** front↔back↔banco.
- `docs/adr/` — decisões de arquitetura (espelhadas em [[Decisões de Arquitetura (ADRs)]]).
- `docs/database_report.md` — esquema completo do banco (resumido em [[Modelo de Dados (Banco)]]).
- `scripts/check_contract.py` — guard estático do contrato front↔back.
