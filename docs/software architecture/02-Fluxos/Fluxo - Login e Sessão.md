---
title: Fluxo - Login e Sessão
tags:
  - fluxo
  - seguranca
  - auth
---

# Fluxo — Login e Sessão

Como o médico se autentica, recebe um **JWT** e abre uma **sessão** rastreada no banco. Também cobre o
_logout_ e as defesas contra força bruta.

## Endpoints

| Método | Rota | Formato | Documento |
|--------|------|---------|-----------|
| POST | `/api/v1/auth/login` | `application/x-www-form-urlencoded` (OAuth2) | abaixo |
| POST | `/api/v1/auth/logout?sessao_id=<id>` | query param | abaixo |

> O login usa `OAuth2PasswordRequestForm` (campos `username` + `password`), por isso é
> _form-urlencoded_ e não JSON. Router: `presentation/api/v1/routers/auth.py`.

## Passo a passo do login

```
┌─ routers/auth.py — login() ───────────────────────────────────────────────┐
│ 1. Extrai ip_origem (request.client.host) e user_agent (header)           │
│ 2. AuthService.check_brute_force(ip)                                       │
│       └─ COUNT de falhas do IP nos últimos 10 min ≥ 5 → HTTP 429           │
│ 3. AuthService.authenticate_doctor(email, senha)                          │
│       └─ SELECT id FROM usuarios                                           │
│          WHERE email=LOWER(:email)                                         │
│            AND senha = crypt(:senha, senha)   * bcrypt nativo do Postgres  │
│            AND ativo = TRUE                                                │
│       └─ devolve usuario_id (int) ou None                                  │
│ 4. Se sucesso: AuthService.open_session() → INSERT tb_log_sessoes          │
│                → retorna sessao_id (BIGSERIAL)                             │
│ 5. AuthService.log_tentativa_login(...)  (sempre, sucesso OU falha)       │
│ 6. Se falhou: HTTP 401 "Credenciais inválidas"                            │
│ 7. issue_access_token(usuario_id, role='doctor', sessao_id)  → JWT HS256   │
│ 8. Devolve TokenLoginResponse(access_token, token_type, sessao_id,        │
│             usuario_id)                                                    │
└────────────────────────────────────────────────────────────────────────────┘
```

## Decisões de segurança importantes

### Senha verificada pelo Postgres, não pelo Python

A comparação `senha = crypt(:senha, senha)` usa o **bcrypt nativo** do PostgreSQL (extensão
`pgcrypto`). O Python **nunca** manipula o hash bcrypt nem a senha em claro além de repassá-la
parametrizada. A coluna `usuarios.senha` é hasheada por trigger (`fn_hash_senha_usuario`) — ver
[[Modelo de Dados (Banco)]].

### O `sessao_id` costura JWT ↔ banco

O `id` da linha em `tb_log_sessoes` é **o mesmo** `sessao_id` que vai dentro do JWT (claim `sid`).
Isso liga o token a um registro de sessão auditável. O JWT carrega `sub` (usuario_id), `role`, `sid`
(sessao_id), `iat` e `exp`. Ver [[Core - Configuração, Segurança e Exceções|security.py]].

### Proteção contra brute-force

`check_brute_force` conta falhas (`sucesso = FALSE`) por IP numa janela de **10 minutos**; ≥ **5**
falhas → **HTTP 429**. Toda tentativa (boa ou má) é registrada em `tb_log_tentativas_login`
(_append-only_), que é a base dessa contagem.

### JWT artesanal (stdlib)

`core/security.py` implementa HS256 só com `hmac` + `hashlib` (sem PyJWT/jose) para evitar problema de
compatibilidade do pacote `cryptography` no host. A verificação usa `hmac.compare_digest` (resistente
a _timing attack_) e checa `exp`. TTL do token: **1800 s (30 min)**.

## Logout

```
POST /api/v1/auth/logout?sessao_id=34
  └─ AuthService.close_session(sessao_id, tipo='logout')
       └─ UPDATE tb_log_sessoes SET encerrada_em=NOW(), tipo_encerramento='logout'
```

> Observação de segurança: o `logout` **não** exige o JWT no código atual — recebe o `sessao_id`
> por query e encerra a sessão correspondente. Como os ids são sequenciais, isso é um ponto a revisar
> caso se queira impedir que um usuário encerre a sessão de outro (mitigação de IDOR — ver
> [[Decisões de Arquitetura (ADRs)|ADR-0003]]).

## Como a identidade chega aos outros endpoints

Depois do login, **todo** endpoint protegido usa `Depends(get_current_doctor)`
(`interfaces/api/dependencies.py`), que:
1. extrai o Bearer token (`OAuth2PasswordBearer`),
2. chama `verify_access_token` (cripto pura, **sem** tocar o banco),
3. confere `role ∈ {doctor, admin}`,
4. devolve um `AuthenticatedDoctor(usuario_id, sessao_id, role)`.

Esse `usuario_id` é o que **escopa** todas as queries ao médico dono (ver
[[Fluxo - Listagem de Pacientes|RBAC por usuario_id]]).

## Arquivos envolvidos

| Arquivo | Papel |
|---------|-------|
| `presentation/api/v1/routers/auth.py` | Endpoints de login/logout |
| `presentation/api/v1/schemas/auth.py` | `TokenLoginResponse` |
| `services/auth_service.py` | Sessões, tentativas, brute-force, autenticação |
| `core/security.py` | Emissão/verificação de JWT HS256 |
| `interfaces/api/dependencies.py` | `get_current_doctor` (guard de rotas) |

## Relacionados
- [[Core - Configuração, Segurança e Exceções]] — JWT em detalhe.
- [[Conformidade LGPD]] — por que logs e auditoria existem.
- [[Modelo de Dados (Banco)]] — `usuarios`, `tb_log_sessoes`, `tb_log_tentativas_login`.
