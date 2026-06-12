---
title: Conformidade LGPD
tags:
  - dominio
  - lgpd
  - seguranca
  - pii
---

# Conformidade LGPD

O CITO trata **dados sensíveis de saúde** (PII clínica). A conformidade com a **LGPD** (Lei Geral de
Proteção de Dados) é um requisito de primeira ordem e está espalhada por várias camadas. Este
documento reúne **todas** as defesas num só lugar.

## As quatro linhas de defesa

```
                  ┌──────────────────────────────────────────────┐
  (1) CIFRAGEM ─► │ Banco: nome cifrado (pgp_sym), CPF só hash    │
                  ├──────────────────────────────────────────────┤
  (2) CHAVE   ──► │ pgp_key injetada por sessão, nunca no banco   │
                  ├──────────────────────────────────────────────┤
  (3) MÁSCARA ──► │ API mascara nome/CPF na borda (masking.py)    │
                  ├──────────────────────────────────────────────┤
  (4) k-ANON  ──► │ Estatísticas: suprime grupos com < 5 (Art.12) │
                  └──────────────────────────────────────────────┘
```

## 1. Cifragem em repouso (no banco)

- **Nome** de paciente e acompanhante: cifrado com `pgp_sym_encrypt` (AES-256, extensão `pgcrypto`),
  guardado como `BYTEA` em `nome_criptografado`. As views (`pacientes`, `acompanhantes`) **decifram**
  em runtime com `pgp_sym_decrypt`.
- **CPF**: **nunca** armazenado. Só o **hash SHA-256** (`cpf_hash`), que serve para lookup por
  igualdade (achar duplicados) sem guardar o número.
- **Senha**: bcrypt (via trigger no banco) — ver [[Fluxo - Login e Sessão]].

O Python **não cifra nada**: ele insere o nome em claro na view, e o **trigger `INSTEAD OF INSERT`**
cifra antes de gravar na tabela física. Ver [[Modelo de Dados (Banco)]] e
`scripts/sql/2026-06-09_p1_write_triggers.sql`.

## 2. Chave de sessão (a `pgp_key`)

> A chave de descriptografia **nunca** é armazenada no banco. É injetada **por conexão**, no início da
> sessão, e some quando a conexão fecha.

Em `db/database.py`, toda sessão começa com:
```python
await session.execute(text("SELECT set_config('app.pgp_key', :key, true)"), {"key": pgp_key})
```
As views leem `current_setting('app.pgp_key')` para decifrar. Resultado: mesmo com acesso ao
armazenamento físico, os nomes ficam **ilegíveis** sem a chave (que vive só em memória durante a
sessão). Ver [[Core - Configuração, Segurança e Exceções]].

## 3. Mascaramento na borda da API ([[Decisões de Arquitetura (ADRs)|ADR-0002]])

Mesmo com o front falando só com a API, a **API não devolve PII em claro** indiscriminadamente. Em
`presentation/api/v1/masking.py`:
- `mask_name("Maria Aparecida Silva")` → `"Maria A*** S***"` (primeiro nome + iniciais).
- CPF → placeholder fixo `CPF_MASK = "***.***.***-**"` (a API só tem o hash, nunca o número).
- Schemas de resposta usam campos explícitos: `nome_masked`, `cpf_masked`.

**Política por endpoint** (consequência prática do ADR-0002):
| Contexto | Nome | CPF |
|----------|------|-----|
| `PatientResponse` (cadastro) | mascarado | ausente |
| Lista de pacientes | nome decifrado da view; CPF → `CPF_MASK` | mascarado |
| Detalhe/prontuário (médico dono) | **em claro** (para o dono) | mascarado |
| Relatórios | `nome_masked` | ausente |

> Limitação consciente: para **paciente já existente**, o front nunca recebe o nome real → laudo PDF
> sai mascarado. No cadastro **novo**, o nome real ainda está na memória do formulário. Detalhe no
> [[Decisões de Arquitetura (ADRs)|ADR-0002]].

## 4. k-anonimato nas estatísticas (Art. 12 LGPD)

O endpoint `GET /dashboard/stats` ([[Fluxo - Dashboard e Histórico]]) aplica **k-anonimato** no nível
de aplicação: se **qualquer** grupo agregado tiver **menos de 5 avaliações** (`K_ANONYMITY_THRESHOLD =
5`), a resposta **inteira** é suprimida com `LGPDComplianceError` → **HTTP 422**.

```python
for row in rows:
    if row.total_avaliacoes < K_ANONYMITY_THRESHOLD:
        raise LGPDComplianceError("... grupo com menos de 5 ... resposta suprimida (Art. 12).")
```

Isso impede **reidentificação** de indivíduos em grupos pequenos. A fonte (`vw_dashboard_anonimizado`)
**já não contém PII** — só agregações. O guard é uma defesa em profundidade adicional.

## 5. Auditabilidade (rastros imutáveis)

Apoio à LGPD por **prestação de contas**: tabelas _append-only_ guardam quem fez o quê.
- `tb_log_sessoes` — ciclo de vida das sessões (id = `sessao_id` do JWT).
- `tb_log_tentativas_login` — toda tentativa (base do anti-brute-force).
- `tb_log_analises` — cada execução de score.
- `tb_auditoria` — trilha geral de mutações (estado anterior/novo em JSONB).

A auditoria de aplicação é **best-effort** (não derruba o fluxo clínico se falhar) — ver
[[Interfaces - Repositórios e Dependências|AuditRepository]] e [[Decisões de Arquitetura (ADRs)|ADR-0004]].

## 6. Controle de acesso (RBAC)

- **RBAC de aplicação:** toda query é escopada ao **médico dono** (`WHERE criado_por = :usuario_id`),
  defesa contra IDOR já que os ids são sequenciais ([[Decisões de Arquitetura (ADRs)|ADR-0003]]).
- **RBAC de banco:** três roles (`nivel_1` app/views, `nivel_2` auditoria/leitura, `nivel_3` BI). O
  `nivel_1` só enxerga as **views**, efetivando "o back não toca tabelas físicas". RLS habilitado. Ver
  [[Modelo de Dados (Banco)]].

## Checklist mental para qualquer mudança

- [ ] Vou expor nome/CPF? → use `nome_masked`/`cpf_masked`, nunca o valor cru.
- [ ] Vou agregar dados de vários pacientes? → preciso de guard de k-anonimato?
- [ ] Vou criar query nova? → tem `WHERE criado_por = :usuario_id` (RBAC)?
- [ ] Vou logar algo? → o CPF é `***redacted***` por design, mas confira que o nome não vaza.

## Relacionados
- [[Decisões de Arquitetura (ADRs)|ADR-0001 / ADR-0002]] · [[Fluxo - Dashboard e Histórico]]
- [[Apresentação - Routers, Schemas e Masking]] · [[Modelo de Dados (Banco)]]
- [[Domínio - Entidades e Value Objects|CPF (value object)]]
