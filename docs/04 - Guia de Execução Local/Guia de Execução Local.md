# Guia de Execução Local

## Como baixar e rodar o CITO a partir do GitHub

Este documento ensina, passo a passo, como obter o projeto CITO no GitHub e executá-lo no seu próprio computador. Ele cobre os pré-requisitos para Windows, Linux e macOS, as dependências necessárias, a configuração e a inicialização do sistema. Não é necessário ser especialista: basta seguir as etapas na ordem.

Repositório: https://github.com/Rhuuuyyyy/CITO

# 1. Visão geral do que será executado

O CITO é composto por três partes que trabalham juntas:

- **Front-end** — a interface que aparece no navegador (feita em React, servida como arquivos estáticos, sem necessidade de compilação).
- **Back-end** — a aplicação que processa as regras e conversa com o banco (feita em Python, com o framework FastAPI).
- **Banco de dados** — onde os dados ficam guardados (PostgreSQL).

Ao rodar localmente, você sobe o **front-end** e o **back-end** na sua máquina, e os conecta a um **banco de dados PostgreSQL** já preparado com o esquema do CITO. O banco normalmente fica em um servidor remoto (Supabase) — você apenas informa o endereço de conexão.

> Resumo do resultado esperado: ao final, você abrirá o navegador em um endereço local (por exemplo, `http://127.0.0.1:5500`) e verá a tela de login do CITO funcionando no seu computador.

# 2. Pré-requisitos

Você precisa de três ferramentas instaladas, além do acesso ao banco de dados:

| Ferramenta | Para que serve | Versão |
|------------|----------------|--------|
| **Git** | Baixar (clonar) o projeto do GitHub | Qualquer versão recente |
| **Python** | Executar o back-end e o script de inicialização | **3.11 ou superior** |
| **Navegador** | Acessar o sistema (Chrome, Edge, Firefox) | Atualizado |
| **Acesso ao banco** | Endereço de conexão (DATABASE_URL) e a chave de criptografia (PGP_KEY) | Fornecidos pela equipe |

> **Importante sobre o banco de dados:** o CITO precisa de um PostgreSQL **já configurado** com o esquema do projeto (tabelas, views, funções e gatilhos). Você não precisa instalá-lo na sua máquina: basta ter o endereço de conexão (`DATABASE_URL`) e a chave de criptografia (`PGP_KEY`), que são fornecidos pelo responsável pelo banco. Sem esses dois valores, o sistema sobe, mas as telas que dependem de dados (login, pacientes, etc.) não funcionam.

## 2.1 Instalando os pré-requisitos por sistema operacional

### Windows

1. **Git:** baixe em [git-scm.com/download/win](https://git-scm.com/download/win) e instale (pode aceitar as opções padrão). Isso também instala o "Git Bash", um terminal útil.
2. **Python:** baixe a versão 3.11 ou superior em [python.org/downloads](https://www.python.org/downloads/). **Ao instalar, marque a opção "Add Python to PATH"** — esse passo é essencial.
3. Para conferir, abra o **Prompt de Comando** (ou o PowerShell) e digite:
   ```
   git --version
   python --version
   ```
   Os dois comandos devem mostrar um número de versão.

### Linux (Ubuntu/Debian)

1. Abra o terminal e instale Git e Python:
   ```
   sudo apt update
   sudo apt install -y git python3 python3-venv python3-pip
   ```
2. Confira as versões:
   ```
   git --version
   python3 --version
   ```
   O Python precisa ser 3.11 ou superior. Em distribuições mais antigas, pode ser necessário instalar uma versão mais nova do Python.

### macOS

1. Instale o **Homebrew** (gerenciador de pacotes), se ainda não tiver, seguindo as instruções em [brew.sh](https://brew.sh).
2. Instale Git e Python:
   ```
   brew install git python@3.12
   ```
3. Confira as versões:
   ```
   git --version
   python3 --version
   ```

# 3. Baixar o projeto (clonar do GitHub)

Abra o terminal na pasta onde deseja guardar o projeto e execute:

```
git clone https://github.com/Rhuuuyyyy/CITO.git
cd CITO
```

Isso cria uma pasta chamada `CITO` com todo o código. A partir daqui, todos os comandos são executados **dentro dessa pasta**.

# 4. Caminho rápido: o script automático (recomendado)

O projeto inclui um script que faz todo o trabalho pesado para você: cria o ambiente, instala as dependências, prepara a configuração e sobe o sistema. No terminal, dentro da pasta `CITO`, execute:

- No **Windows**:
  ```
  python run.py
  ```
- No **Linux/macOS**:
  ```
  python3 run.py
  ```

O que o script faz, em ordem:

1. Confere se o seu Python é 3.11 ou superior.
2. Cria um **ambiente virtual** isolado na pasta `.venv` (para não misturar com outros projetos).
3. Instala automaticamente todas as **dependências** do projeto.
4. Cria o arquivo de configuração `.env` a partir do modelo `.env.example` (se ainda não existir).
5. Sobe o **back-end** (porta 8000) e o **front-end** (porta 5500) e **abre o navegador** em `http://127.0.0.1:5500`.

Para **encerrar**, volte ao terminal e pressione **Ctrl + C** — os dois servidores são finalizados juntos.

> **Atenção:** na primeira execução, o `.env` é criado com valores de exemplo. Antes de o login funcionar, você precisa editar esse arquivo e preencher os dados reais do banco — veja a seção 6.

# 5. Caminho manual (passo a passo)

Caso prefira controlar cada etapa, ou o script automático não se aplique ao seu ambiente, siga abaixo.

## 5.1 Criar o ambiente virtual e instalar as dependências

Um "ambiente virtual" é uma pasta isolada onde as dependências do projeto ficam separadas do resto do sistema.

- No **Windows** (PowerShell):
  ```
  python -m venv .venv
  .venv\Scripts\Activate.ps1
  pip install -e .
  ```
- No **Linux/macOS**:
  ```
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -e .
  ```

O comando `pip install -e .` lê o arquivo `pyproject.toml` e instala tudo o que o projeto precisa.

## 5.2 As dependências do projeto

O back-end usa as seguintes bibliotecas principais (instaladas automaticamente pelo passo anterior):

| Biblioteca | Função |
|------------|--------|
| **FastAPI** | Framework do back-end (a API web) |
| **Uvicorn** | Servidor que executa a API durante o desenvolvimento |
| **Pydantic** / pydantic-settings | Validação de dados e leitura da configuração |
| **SQLAlchemy** (modo assíncrono) | Comunicação com o banco de dados |
| **asyncpg** | Driver de conexão com o PostgreSQL |
| **python-multipart** | Suporte ao formulário de login |

O **front-end não tem dependências para instalar**: ele usa bibliotecas carregadas diretamente pela internet (via CDN) quando a página abre.

## 5.3 Subir o back-end

Com o ambiente virtual ativado, inicie a API:

```
uvicorn app.main:app --reload --port 8000
```

Para conferir se subiu, acesse no navegador `http://localhost:8000/health` — deve responder com um status. A documentação técnica da API fica em `http://localhost:8000/api/v1/docs`.

## 5.4 Subir o front-end

Em **outro terminal** (deixe o back-end rodando no primeiro), sirva a pasta do front-end por HTTP:

- No **Windows**:
  ```
  cd frontend
  python -m http.server 5500
  ```
- No **Linux/macOS**:
  ```
  cd frontend
  python3 -m http.server 5500
  ```

Depois, abra o navegador em **`http://127.0.0.1:5500`**.

> **Não abra os arquivos do front-end com clique duplo** (endereços que começam com `file://`). O front precisa ser servido por HTTP, senão o navegador bloqueia a comunicação com a API.

# 6. Configurar o arquivo .env

A configuração fica no arquivo `.env`, na raiz do projeto. Crie-o a partir do modelo:

- No **Windows**:
  ```
  copy .env.example .env
  ```
- No **Linux/macOS**:
  ```
  cp .env.example .env
  ```

Em seguida, abra o `.env` em um editor de texto e preencha os valores. Os campos mais importantes:

| Campo | O que é | Observação |
|-------|---------|------------|
| `DATABASE_URL` | Endereço de conexão com o banco | Precisa começar com `postgresql+asyncpg://`. Fornecido pela equipe do banco. |
| `PGP_KEY` | Chave de criptografia dos dados | Deve ser **a mesma** chave usada para cifrar os dados existentes. |
| `SECRET_KEY` | Chave de assinatura do login | Um valor longo e aleatório. |
| `CORS_ORIGINS` | Endereços autorizados a acessar a API | Para o modo local, inclua `http://127.0.0.1:5500,http://localhost:5500`. |

> **O detalhe que mais causa dúvida:** se o endereço onde você abre o front-end (por exemplo, `http://127.0.0.1:5500`) não estiver listado em `CORS_ORIGINS`, o navegador bloqueia as chamadas e as telas não carregam, mesmo com tudo "no ar". Confira esse campo primeiro se algo não funcionar.

Para gerar um `SECRET_KEY` aleatório, você pode usar:

```
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

# 7. Acessar o sistema

Com o back-end (porta 8000) e o front-end (porta 5500) no ar, e o `.env` configurado:

1. Abra o navegador em **`http://127.0.0.1:5500`**.
2. Faça login com um usuário válido (fornecido pelo administrador).
3. Pronto: você está usando o CITO localmente.

> Para aprender a **usar** o sistema depois de aberto (cadastro de pacientes, triagem, laudo, etc.), consulte o **Manual de Uso** do projeto.

# 8. Resolução de problemas comuns

| Problema | Causa provável | Solução |
|----------|----------------|---------|
| `git` ou `python` "não reconhecido" | A ferramenta não foi instalada ou não está no PATH | Reinstale marcando "Add to PATH" (Windows) ou confira a instalação |
| Erro de versão do Python | Python abaixo de 3.11 | Instale uma versão 3.11 ou superior |
| As telas não carregam, mesmo com tudo no ar | Endereço do front ausente em `CORS_ORIGINS` | Adicione a origem exata ao `.env` e reinicie o back-end |
| Erro de driver ao conectar no banco | `DATABASE_URL` sem `+asyncpg` | Use o formato `postgresql+asyncpg://...` |
| Nomes aparecem ilegíveis ou em branco | `PGP_KEY` incorreta | Use exatamente a mesma chave usada para cifrar os dados |
| O login não funciona | `.env` ainda com valores de exemplo | Preencha `DATABASE_URL`, `PGP_KEY`, `SECRET_KEY` e `CORS_ORIGINS` |
| A porta já está em uso | Outro programa ocupa a 8000 ou a 5500 | Encerre o outro programa ou troque a porta no comando |

# 9. Resumo dos comandos

Para referência rápida, o caminho completo do zero (Linux/macOS; no Windows, troque `python3` por `python` e a ativação do ambiente):

```
git clone https://github.com/Rhuuuyyyy/CITO.git
cd CITO
python3 run.py
```

Ou, de forma manual:

```
git clone https://github.com/Rhuuuyyyy/CITO.git
cd CITO
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
cp .env.example .env        # edite o .env com os dados do banco
uvicorn app.main:app --reload --port 8000
# em outro terminal:
cd frontend && python3 -m http.server 5500
# abra http://127.0.0.1:5500
```

> Para um material de referência mais completo (incluindo o ambiente de produção na nuvem), consulte também o **Guia de Instalação e Setup** do projeto.
