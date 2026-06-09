# CITO — Sistema de Triagem para Síndrome do X Frágil

Ferramenta de **pré-diagnóstico** da Síndrome do X Frágil (SXF) para uso clínico: cadastro de
pacientes, triagem por checklist com escore validado, encaminhamento para teste genético (FMR1),
agenda e relatórios. Conformidade com LGPD (PII cifrada no banco e mascarada na API).

## Arquitetura (3 camadas)

```
Front-end (React via CDN, sem bundler)
      │  HTTPS/JSON, somente via src/api/client.js (Bearer JWT)
      ▼
Back-end (FastAPI, hexagonal/ports & adapters)
      │  SQLAlchemy async + asyncpg
      ▼
Banco (PostgreSQL + pgcrypto: tabelas tb_* cifradas → views lógicas com triggers)
```

O front fala **exclusivamente** com a API — não há mais acesso direto ao banco. As decisões de
arquitetura estão em [`docs/adr/`](docs/adr/); o plano-de-registro em [`SPEC.md`](SPEC.md).

## Pré-requisitos

- Python ≥ 3.11
- PostgreSQL com o esquema do CITO já aplicado (tabelas, views e triggers — grupo de Banco)
- Um servidor de arquivos estáticos para o front (ex.: extensão *Live Server* do VS Code,
  ou `python -m http.server`)

## 1. Back-end

```bash
cd workspace/CITO

# ambiente virtual + dependências
python -m venv .venv
source .venv/bin/activate
pip install -e .            # usa as dependências do pyproject.toml

# configuração
cp .env.example .env        # depois edite o .env (veja os comentários do arquivo)

# subir a API
uvicorn app.main:app --reload --port 8000
```

Variáveis essenciais no `.env` (detalhes em `.env.example`):

| Var | Para quê | Atenção |
|-----|----------|---------|
| `DATABASE_URL` | conexão | **precisa** do driver `postgresql+asyncpg://…` |
| `PGP_KEY` | cripto das views | **a mesma** chave usada para cifrar os dados |
| `SECRET_KEY` | assinatura do JWT | valor longo e aleatório |
| `CORS_ORIGINS` | liberar o front | origem **exata** do front; sem isto o navegador bloqueia tudo |

Verificações rápidas **sem banco**:
- `python -c "import app.main"` — valida imports, schemas e wiring de rotas.
- `python scripts/check_contract.py` — **guard de contrato front↔back**: confere que todo endpoint
  consumido pelo front existe no back e que os payloads do front validam contra os schemas. Rode
  isto sempre que qualquer um dos 3 grupos mexer no contrato (rotas/campos). Exit 0 = OK.

API no ar: `GET http://localhost:8000/health` e docs em `http://localhost:8000/api/v1/docs`.

## 2. Front-end

O front é estático (sem build). Sirva a pasta `frontend/` **por HTTP** (não abra via `file://` —
o CORS não funciona com `file://`):

```bash
cd workspace/CITO/frontend
python -m http.server 5500          # → http://127.0.0.1:5500
```

- A URL da API tem default `http://localhost:8000/api/v1`. Para apontar para outro host, defina
  `window.CITO_API_BASE` **antes** de `src/api/client.js` no `index.html`.
- A origem onde você serve o front (ex.: `http://127.0.0.1:5500`) **precisa** estar em
  `CORS_ORIGINS` no `.env` do back.

## 3. Dependência do banco (grupo de Banco)

A view `avaliacoes` precisa expor a coluna **`recomenda_exame` (BOOLEAN)** — consumida por
dashboard e histórico. Sem ela, esses endpoints falham em runtime. Ver
[`docs/adr/0005-dependencia-da-view-recomenda-exame.md`](docs/adr/0005-dependencia-da-view-recomenda-exame.md).

## Fluxo de validação (E2E)

Login → Dashboard → cadastrar paciente → nova triagem (checklist + histórico familiar) →
prontuário do paciente → agenda → relatórios (Configurações).
