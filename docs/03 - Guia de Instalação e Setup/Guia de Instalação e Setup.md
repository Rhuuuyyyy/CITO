# Guia de Instalação e Setup

## Sistema CITO — Ferramenta de Pré-diagnóstico da Síndrome do X Frágil

Este guia é prático e destina-se a dois públicos: o desenvolvedor que precisa subir o projeto localmente e a pessoa que implanta ou deseja compreender o ambiente de produção no Azure App Service. Todas as instruções estão fundamentadas nos arquivos de configuração, dependências e scripts de inicialização efetivamente presentes no repositório.

# 1. Visão geral da implantação

O CITO é composto por três partes: um front-end estático (React via CDN, sem etapa de build), um back-end FastAPI e um banco PostgreSQL. Existem dois modos de execução, e é fundamental não confundi-los:

- **Local (desenvolvimento):** back-end e front-end rodam como dois processos separados, em portas distintas (8000 e 5500). O script `run.py` automatiza essa configuração. Nesse modo, o navegador acessa o front-end em uma origem e a API em outra, o que torna o CORS obrigatório.
- **Produção (Azure App Service):** o próprio FastAPI serve o front-end estático, na mesma origem da API. O script `run.py` **não** é executado em produção. Como front e back compartilham a origem, o CORS deixa de ser necessário nesse cenário.

A distinção está documentada no cabeçalho do próprio `run.py` e materializada em `app/main.py`, que serve a pasta `frontend/` quando ela existe ao lado de `app/`.

# 2. Pré-requisitos

| Requisito | Detalhe |
|-----------|---------|
| Python | Versão 3.11 ou superior (declarado em `pyproject.toml`: `requires-python = ">=3.11"`) |
| PostgreSQL | Banco com o esquema do CITO já aplicado: tabelas, views, gatilhos e funções (responsabilidade do grupo de Banco). O ambiente de referência usa PostgreSQL 17.6 no Supabase |
| Extensões do banco | `pgcrypto` (cifragem e hash) e `pg_trgm` (busca por similaridade) |
| Navegador | Qualquer navegador moderno para servir e acessar o front-end |

> O back-end depende de comportamentos do banco (gatilhos, defaults e grants) que não são verificáveis apenas por importação do código. Em especial, a view `avaliacoes` precisa expor a coluna calculada `recomenda_exame`. A lista completa de suposições sobre o banco está na especificação de integração e deve ser validada no teste ponta a ponta.

# 3. Configuração de ambiente (.env)

A configuração é tipada e carregada de variáveis de ambiente ou de um arquivo `.env`, por meio de `app/core/config.py` (Pydantic Settings). O repositório fornece um modelo em `.env.example`; copie-o para `.env` e ajuste os valores. O arquivo `.env` **nunca** deve ser versionado (já consta no `.gitignore`).

| Variável | Para que serve | Atenção |
|----------|----------------|---------|
| `APP_NAME` | Nome exibido do aplicativo | Opcional (padrão "CITO Backend") |
| `APP_VERSION` | Versão do aplicativo | Opcional (padrão "0.1.0") |
| `ENVIRONMENT` | Ambiente (`development`/`production`) | Opcional |
| `DEBUG` | Liga/desliga modo de depuração | Opcional |
| `API_PREFIX` | Prefixo de todas as rotas | Padrão `/api/v1` |
| `SECRET_KEY` | Assinatura do JWT (HS256) | **Obrigatória em produção.** Valor longo e aleatório (≥ 32 bytes). Mínimo de 8 caracteres validado |
| `CORS_ORIGINS` | Origens liberadas para o front | Necessária no modo local. Origem exata (esquema+host+porta), sem barra final. Aceita CSV ou JSON |
| `DATABASE_URL` | Conexão com o PostgreSQL | **Precisa do driver assíncrono** `postgresql+asyncpg://...`. Armazenada como segredo |
| `PGP_KEY` | Chave de cifragem usada pelas views | **A mesma** chave usada para cifrar os dados existentes. Armazenada como segredo |

Para gerar um `SECRET_KEY` adequado:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Exemplo de `.env` para desenvolvimento local (baseado em `.env.example`):

```
ENVIRONMENT=development
DEBUG=true
API_PREFIX=/api/v1
SECRET_KEY=<gerado-com-secrets.token_urlsafe>
CORS_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
DATABASE_URL='postgresql+asyncpg://USUARIO:SENHA@HOST:5432/cito'
PGP_KEY='a-mesma-chave-usada-para-cifrar-os-dados'
```

> Detalhe técnico: `CORS_ORIGINS` aceita tanto JSON (`["http://a","http://b"]`) quanto CSV (`http://a,http://b`); o parser de configuração trata ambos. Já `DATABASE_URL` e `PGP_KEY` são tratados como segredos (não vazam em log nem em `repr`). O esquecimento da origem exata em `CORS_ORIGINS` é a causa número um de o front não funcionar mesmo com a API respondendo.

# 4. Setup local — caminho automatizado (recomendado)

O modo mais simples de subir tudo localmente é o script `run.py`, que cuida de todo o ciclo: verifica a versão do Python, cria e repara o ambiente virtual `.venv`, instala as dependências do `pyproject.toml`, cria o `.env` a partir do `.env.example` (se necessário) e sobe os dois servidores, abrindo o navegador ao final.

```bash
cd CITO
python run.py
```

O que ele faz, em ordem:

1. Verifica Python ≥ 3.11 (encerra com mensagem se for inferior).
2. Cria ou repara o ambiente virtual em `.venv`.
3. Atualiza o `pip` e instala as dependências com `pip install -e .`.
4. Cria `.env` a partir de `.env.example`, se ainda não existir — e avisa para configurar `DATABASE_URL`, `PGP_KEY`, `SECRET_KEY` e `CORS_ORIGINS`.
5. Sobe a API (Uvicorn) na porta 8000 e o front-end estático na porta 5500, e abre `http://127.0.0.1:5500`.

Encerre os dois processos com Ctrl+C — eles são finalizados juntos.

> Atenção: na primeira execução o `.env` é criado com valores padrão (de exemplo). É necessário editá-lo com os valores reais do banco e dos segredos antes que o login e as telas que dependem de dados funcionem.

# 5. Setup local — caminho manual

Caso prefira controlar cada etapa, ou esteja em um ambiente onde o script automatizado não se aplique, siga os passos abaixo.

## 5.1 Back-end

```bash
cd CITO

# ambiente virtual + dependencias
python -m venv .venv
source .venv/bin/activate        # no Windows: .venv\Scripts\activate
pip install -e .                 # usa as dependencias do pyproject.toml

# configuracao
cp .env.example .env             # depois edite o .env

# subir a API
uvicorn app.main:app --reload --port 8000
```

Verificações rápidas que dispensam o banco no ar (o asyncpg conecta de forma preguiçosa):

```bash
# valida imports, schemas e wiring de rotas
python -c "import app.main"

# guarda de contrato front<->back (rotas + payloads)
python scripts/check_contract.py
```

O segundo comando confere, de forma estática, que todo endpoint consumido pelo front existe no back e que os payloads do front validam contra os schemas. Saída com código 0 indica contrato íntegro. Rode-o sempre que mexer em rotas ou campos.

Com a API no ar, verifique:

- Saúde: `GET http://localhost:8000/health`
- Documentação interativa: `http://localhost:8000/api/v1/docs` (Swagger) e `/api/v1/redoc`

## 5.2 Front-end

O front é estático, sem build. Sirva a pasta `frontend/` por HTTP (não abra via `file://`, pois o CORS não funciona com esse esquema):

```bash
cd CITO/frontend
python -m http.server 5500 --bind 127.0.0.1   # -> http://127.0.0.1:5500
```

- A URL base da API tem valor padrão `'/api/v1'`. Para apontar a outro host, defina `window.CITO_API_BASE` no `index.html`, antes do carregamento de `src/api/client.js`.
- A origem onde o front é servido (por exemplo, `http://127.0.0.1:5500`) **precisa** constar em `CORS_ORIGINS` no `.env` do back. Sem isso, o navegador bloqueia todas as chamadas.

# 6. Dependências do projeto

As dependências de produção do back-end estão declaradas em `pyproject.toml` (e espelhadas em `requirements.txt`, usado pela implantação no Azure).

| Pacote | Papel |
|--------|-------|
| `fastapi` (≥ 0.115) | Framework web |
| `uvicorn[standard]` (≥ 0.32) | Servidor ASGI (desenvolvimento) |
| `gunicorn` (≥ 22) | Servidor de produção (presente em `requirements.txt`) |
| `pydantic` (≥ 2.9) + `pydantic-settings` (≥ 2.6) | Validação, serialização e configuração |
| `sqlalchemy[asyncio]` (≥ 2.0) | ORM/Core em modo assíncrono |
| `asyncpg` (≥ 0.30) | Driver PostgreSQL assíncrono |
| `python-multipart` (≥ 0.0.12) | Suporte a formulários (login OAuth2) |

As dependências de desenvolvimento (opcionais) incluem `pytest`, `pytest-asyncio`, `httpx`, `ruff` e `mypy`, declaradas no grupo `[project.optional-dependencies].dev` do `pyproject.toml`. O front-end não possui dependências instaláveis: React, Babel, Tailwind, jsPDF e fontes são carregados por CDN no `index.html`.

# 7. Implantação em produção (Azure App Service)

Em produção, a aplicação é implantada como um único serviço no Azure App Service, no qual o FastAPI serve tanto a API quanto o front-end estático.

## 7.1 Como o front-end é servido pelo back-end

Em `app/main.py`, quando a pasta `frontend/` existe ao lado de `app/`, são registradas duas rotas:

- A rota raiz (`GET /`) devolve o `frontend/index.html`.
- Uma rota *catch-all* (`GET /{full_path:path}`) devolve o arquivo solicitado (CSS, JS, imagens) quando ele existe, ou o `index.html` caso contrário.

Como front e API ficam na mesma origem, o cliente de API usa a base padrão `'/api/v1'` e não há necessidade de configurar `CORS_ORIGINS` para o front nesse cenário.

## 7.2 Build durante a implantação

O repositório inclui o arquivo `.deployment`, que ativa o build do lado do Azure:

```
[config]
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

Com essa opção, o Oryx (mecanismo de build do App Service) instala as dependências de `requirements.txt` durante a publicação. Por isso o `gunicorn` está presente em `requirements.txt`: ele é o servidor de produção.

## 7.3 Comando de inicialização (Startup Command)

Em produção, o Azure invoca o servidor diretamente — o `run.py` não participa. O objeto ASGI exportado é `app`, em `app/main.py` (`uvicorn app.main:app` localmente). No App Service, configura-se um Startup Command que sobe a aplicação por meio do Gunicorn com workers Uvicorn, no padrão recomendado para FastAPI:

```
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app
```

O App Service expõe a aplicação na porta interna padrão; o Gunicorn deve escutar nessa porta (no Linux App Service, normalmente a variável `PORT` informada pelo ambiente). O número de *workers* deve ser ajustado ao plano de hospedagem.

## 7.4 Variáveis de ambiente em produção

No App Service, defina as configurações da aplicação (App Settings) com os mesmos nomes do `.env`, no mínimo: `SECRET_KEY`, `DATABASE_URL` (com o driver `postgresql+asyncpg://`), `PGP_KEY` e `ENVIRONMENT=production`. Como o front é servido pela mesma origem, `CORS_ORIGINS` só é necessário se houver clientes em origens distintas.

> Observação sobre conectividade do banco: no ambiente de referência (Supabase), a conexão da aplicação usa o *session pooler* IPv4 (`aws-1-sa-east-1.pooler.supabase.com:5432`), pois o host direto é apenas IPv6. Esse detalhe importa ao montar a `DATABASE_URL` no ambiente de hospedagem.

## 7.5 Empacotamento da publicação

O arquivo `.vscode/settings.json` define `appService.zipIgnorePattern`, que exclui do pacote de publicação artefatos desnecessários: caches de Python, diretórios de build, ambientes virtuais (`.venv`, `env`, `venv`) e o próprio `.env`. Isso evita publicar segredos locais e reduz o tamanho do pacote — os segredos de produção devem vir das App Settings, não de um `.env` empacotado.

# 8. Sonda de saúde e diagnóstico

A aplicação expõe `GET /health` fora do prefixo da API, para uso por infraestrutura. No estado atual do código, esse endpoint opera em modo de diagnóstico: além do status, retorna informações úteis para depurar a implantação no Azure — se a pasta `frontend` foi encontrada, o caminho calculado para ela e o conteúdo do diretório raiz. É uma forma rápida de confirmar que o empacotamento incluiu o front-end no servidor.

# 9. Fluxo de validação ponta a ponta

Após a configuração, valide a integração percorrendo o caminho clínico completo:

1. **Login** com um usuário válido (médico ou administrador).
2. **Dashboard** — confirma que o resumo operacional carrega.
3. **Cadastrar paciente** — testa cifragem de nome e mascaramento de CPF.
4. **Nova triagem** — checklist de sintomas + histórico familiar; submissão e cálculo de escore no banco.
5. **Prontuário do paciente** — histórico de avaliações e reimpressão de laudo.
6. **Agenda** — criação e edição de agendamentos.
7. **Relatórios** (em Configurações) — gráficos a partir das avaliações finalizadas.
8. **Logout** — encerramento da sessão.

# 10. Resolução de problemas comuns

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| A API responde no `curl`, mas o front não funciona | Origem do front ausente em `CORS_ORIGINS` (modo local) | Inclua a origem exata (ex.: `http://127.0.0.1:5500`) no `.env` |
| Erro de driver ao conectar no banco | `DATABASE_URL` sem `+asyncpg` | Use `postgresql+asyncpg://...` |
| Nomes ilegíveis ou falha ao decifrar | `PGP_KEY` diferente da usada para cifrar os dados | Configure a mesma chave PGP dos dados existentes |
| Dashboard/histórico falham em runtime | A view `avaliacoes` não expõe `recomenda_exame` | Aplicar a correção da view (grupo de Banco) |
| Front não aparece em produção | Pasta `frontend/` não foi empacotada | Verifique `GET /health` e o conteúdo da raiz publicada |
| Login retorna 429 | Proteção contra força bruta acionada | Aguardar 10 minutos (5 falhas por IP na janela) |

# 11. Resumo de portas e URLs

| Recurso | Local | Produção (Azure) |
|---------|-------|-------------------|
| Back-end (API) | `http://localhost:8000/api/v1` | Mesma origem do site, sob `/api/v1` |
| Front-end | `http://127.0.0.1:5500` | Servido pela própria aplicação (rota raiz) |
| Documentação da API | `http://localhost:8000/api/v1/docs` | `<host>/api/v1/docs` |
| Saúde | `http://localhost:8000/health` | `<host>/health` |
