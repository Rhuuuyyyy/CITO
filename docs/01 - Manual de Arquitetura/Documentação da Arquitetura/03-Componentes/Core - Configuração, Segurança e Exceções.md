---
title: Core - Configuração, Segurança e Exceções
tags:
  - camada/core
  - referencia
  - seguranca
---

# Core — Configuração, Segurança e Exceções

A pasta `app/core/` (mais `app/db/`) concentra a **infraestrutura transversal**: configuração tipada,
JWT, exceções de domínio e a sessão de banco. Nada aqui é regra de negócio; é o "encanamento" que
todas as camadas usam.

---

## `core/config.py` — configuração tipada

`Settings(BaseSettings)` (pydantic-settings) lê variáveis de ambiente / `.env` num objeto **tipado e
validado**. `get_settings()` é cacheado (`@lru_cache`) e injetável via `Depends`.

| Setting | Default | Para quê |
|---------|---------|----------|
| `app_name` / `app_version` | "CITO Backend" / "0.1.0" | Metadados do app |
| `environment` / `debug` | "development" / False | Ambiente |
| `api_prefix` | `/api/v1` | Prefixo de todas as rotas |
| `secret_key` | "change-me…" (min 8) | **Assinatura do JWT** |
| `cors_origins` | `[]` | Origens liberadas (CORS) |
| `database_url` | `postgresql+asyncpg://…` | Conexão (driver **async** obrigatório) — `SecretStr` |
| `pgp_key` | "change-me-pgp-key" | **Chave de cifragem** das views — `SecretStr` |

Detalhes finos:
- `cors_origins` aceita **JSON** (`["http://a","http://b"]`) **ou CSV** (`http://a,http://b`). O
  `NoDecode` + `field_validator` cuidam disso (pydantic-settings não tenta parsear JSON antes da hora).
- `database_url` e `pgp_key` são `SecretStr` — não vazam em `repr`/log; lê-se com
  `.get_secret_value()`.

> Em produção, **defina** `secret_key`, `pgp_key`, `database_url` e `cors_origins` no `.env`. Os
> defaults só existem para o `import app.main` rodar sem `.env`.

---

## `core/security.py` — JWT HS256 artesanal

Emite e verifica **JWT HS256** usando **apenas a stdlib** (`hmac`, `hashlib`, `base64`, `json`) — sem
PyJWT/jose (evita o problema de compatibilidade do `cryptography` no host). Trocar por RS256 no futuro
mexe **só neste arquivo** (nota no cabeçalho).

```python
@dataclass(frozen=True)
class TokenClaims:
    usuario_id: int   # claim 'sub'
    role: str         # 'doctor' | 'admin'
    sessao_id: int    # claim 'sid' → FK tb_log_sessoes.id
    exp: float
```

- `issue_access_token(usuario_id, role, sessao_id, ttl=1800)` → monta header+payload (base64url) e
  assina com `secret_key`. Claims: `sub`, `role`, `sid`, `iat`, `exp`. **TTL: 30 min.**
- `verify_access_token(token)` → valida formato (3 partes), confere a assinatura com
  **`hmac.compare_digest`** (resistente a _timing attack_), checa `exp` e presença das claims; em
  qualquer falha levanta `JWTError`.

Usado por [[Fluxo - Login e Sessão]] (emissão) e por `get_current_doctor` (verificação) em
[[Interfaces - Repositórios e Dependências]].

---

## `core/exceptions.py` — hierarquia de exceções de domínio

Exceções **neutras de tecnologia**: o domínio levanta estas, **nunca** `fastapi.HTTPException`. Os
_handlers_ em [[Composition Root (main.py)|main.py]] as traduzem para HTTP (RFC 7807).

```
SXFpError (base, code="cito.error")  → 500
├── DomainError          ("domain.error")        → 422  regra de negócio violada
├── NotFoundError        ("resource.not_found")  → 404
├── ConflictError        ("resource.conflict")   → 409
├── AuthenticationError  ("auth.unauthenticated")→ 401
├── AuthorizationError   ("auth.forbidden")      → 403
└── LGPDComplianceError  ("lgpd.violation")      → 422  privacidade (k-anonimato)
```

O atributo de classe `code` vira o campo `type` do Problem Details. `LGPDComplianceError` é o destaque
— ver [[Fluxo - Dashboard e Histórico]] e [[Conformidade LGPD]].

---

## `db/database.py` — engine, sessão e a injeção da `pgp_key`

```python
engine = create_async_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
AsyncSessionFactory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def get_db_session():
    async with AsyncSessionFactory() as session:
        await session.execute(text("SELECT set_config('app.pgp_key', :key, true)"), {...})
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback(); raise
```

Três coisas cruciais acontecem aqui:

1. **Injeção da chave PGP por sessão.** Logo ao abrir a sessão, executa
   `set_config('app.pgp_key', <pgp_key>, true)`. As views leem `current_setting('app.pgp_key')` para
   **decifrar** nomes. A chave **nunca** é armazenada no banco — vive só durante a conexão. Coração da
   [[Conformidade LGPD|cifragem por sessão]].
2. **Unidade de trabalho (Unit of Work).** `get_db_session` é injetado via `Depends` em cada
   requisição; faz `commit()` no fim ou `rollback()` em qualquer exceção. É isso que dá
   **atomicidade** ao [[Fluxo - Submissão de Anamnese|fluxo de anamnese]] (7 passos, 1 transação).
3. **Conexão _lazy_.** O asyncpg só conecta no primeiro uso, então `import app.main` funciona sem
   banco no ar (essencial para os checks estáticos: `import app.main` e `check_contract.py`).

## Relacionados
- [[Composition Root (main.py)]] — onde os handlers de exceção são registrados.
- [[Conformidade LGPD]] — cifragem, mascaramento e k-anonimato.
- [[Fluxo - Login e Sessão]] — uso do JWT.
