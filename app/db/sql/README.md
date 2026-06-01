# Banco de Dados — Sistema SXF

Scripts SQL que montam todo o esquema do banco (PostgreSQL 15+ / Supabase) do
módulo de apoio ao diagnóstico da **Síndrome do X Frágil**. São independentes do
back-end: rodam puros no SQL Editor do Supabase ou via `psql`.

## Ordem de execução

| Ordem | Arquivo | Conteúdo |
|:-----:|---------|----------|
| 1º | `sxf_parte1_tabelas.sql` | Extensões, limpeza, todas as tabelas e o seed dos 12 sintomas + parâmetros de triagem. |
| 2º | `sxf_parte2_funcoes_views.sql` | Funções, triggers e views (camada de criptografia transparente) + view materializada do dashboard. |
| 3º | `sxf_parte3_rbac.sql` | Roles e permissões (RBAC). **Opcional no Supabase** (pode usar RLS nativo). |

Via `psql`:

```bash
psql "$DATABASE_URL" -f sxf_parte1_tabelas.sql
psql "$DATABASE_URL" -f sxf_parte2_funcoes_views.sql
psql "$DATABASE_URL" -f sxf_parte3_rbac.sql   # opcional
```

## Chave de criptografia (PGP)

A chave **nunca** fica no banco. Ela vive na variável de ambiente `PGP_KEY` do
servidor e é injetada na sessão antes de qualquer operação com dados cifrados.
O back-end já faz isso em `app/db/database.py`:

```sql
SELECT set_config('app.pgp_key', '<sua_chave>', true);
```

Sem essa chamada, as views devolvem erro ao tentar descriptografar e
`fn_calcular_score_triagem` aborta com mensagem explícita.

## Regras de acesso

- O back-end escreve/lê **sempre pelas views** `pacientes`, `acompanhantes` e
  `avaliacoes` — nunca direto nas tabelas `tb_*` cifradas.
- CPF é gravado como **hash SHA-256** (só dígitos). Para buscar:
  `WHERE cpf_hash = encode(sha256(<digitos>::bytea), 'hex')`.
- O score é calculado e finalizado por `fn_calcular_score_triagem(avaliacao_id)`.

## Variáveis de ambiente

Ver `.env.example` na raiz. Mínimo necessário:

```
DATABASE_URL=postgresql+asyncpg://usuario:senha@host:5432/postgres
PGP_KEY=<chave aleatória de 32+ caracteres>
```

Gerar uma chave forte:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```
