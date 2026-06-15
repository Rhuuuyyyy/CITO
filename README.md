<p align="center">
  <img src="frontend/assets/CITO.png" alt="CITO" width="900">
</p>


---

## Sobre o projeto

O **CITO** é um sistema de **triagem (pré-diagnóstico)** da Síndrome do X Frágil (SXF), voltado ao uso
clínico. A partir de um checklist de sinais e do histórico do paciente, o sistema calcula um escore
validado cientificamente e indica quando há recomendação de encaminhamento ao **exame genético do gene
FMR1**, gerando ainda um laudo em PDF.

O sistema **não realiza diagnóstico**: ele apoia a decisão do profissional de saúde, indicando os
pacientes que devem ser encaminhados para confirmação genética. A proteção de dados pessoais, em
conformidade com a **LGPD**, é um requisito de primeira ordem em toda a solução.

## Demonstração

O sistema está disponível em produção: **[citosina.com.br](https://citosina.com.br)**. O acesso é feito
por login individual, fornecido pelo administrador.

## Principais funcionalidades

- **Cadastro de pacientes** com prontuário completo, foto, arquivamento e exclusão.
- **Triagem clínica** por checklist de sinais e histórico familiar, com cálculo automático de escore.
- **Recomendação de encaminhamento** ao exame genético (FMR1) conforme limiar por sexo.
- **Laudo em PDF** gerado ao final da triagem, com reimpressão a partir do histórico.
- **Agenda** de compromissos, com criação, edição e cancelamento.
- **Relatórios** de atividade com filtros e exportação.
- **Gestão de usuários** (médicos) para administradores.
- **Segurança e LGPD**: criptografia de dados pessoais, isolamento por profissional, autenticação por
  token e supressão estatística por k-anonimato.

## Tecnologias

| Camada | Tecnologias |
|--------|-------------|
| Front-end | React (via CDN, sem empacotador), Tailwind CSS, jsPDF |
| Back-end | Python, FastAPI, Pydantic, SQLAlchemy (assíncrono), Uvicorn/Gunicorn |
| Banco de dados | PostgreSQL (com `pgcrypto` para criptografia) |
| Arquitetura | Hexagonal (ports & adapters) no back-end; comunicação via API HTTPS/JSON |

## Arquitetura

O sistema é organizado em três camadas, com comunicação estrita do cliente em direção ao dado:

```
Front-end (navegador)  ->  Back-end (API FastAPI)  ->  Banco de dados (PostgreSQL)
```

O front-end conversa exclusivamente com a API; o back-end acessa o banco apenas por meio de views
lógicas que cifram e decifram os dados sensíveis de forma transparente. Os detalhes estão na
documentação de arquitetura.

## Como executar localmente

Pré-requisitos: **Git** e **Python 3.11+**. O caminho mais simples:

```bash
git clone https://github.com/Rhuuuyyyy/CITO.git
cd CITO
python run.py
```

O script `run.py` cria o ambiente, instala as dependências, prepara a configuração e sobe o back-end
(porta 8000) e o front-end (porta 5500), abrindo o navegador automaticamente.

> Antes do primeiro uso, é necessário preencher o arquivo `.env` com os dados de conexão do banco.
> O passo a passo detalhado, por sistema operacional, está no **Guia de Execução Local**.

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [Manual de Uso](docs/Manual) | Como usar o sistema (para profissionais de saúde) |
| [Manual de Arquitetura](docs/01%20-%20Manual%20de%20Arquitetura) | Desenho e organização do sistema |
| [Regras de Negócio](docs/02%20-%20Regras%20de%20Neg%C3%B3cio) | Regras que governam o comportamento do sistema |
| [Guia de Instalação e Setup](docs/03%20-%20Guia%20de%20Instala%C3%A7%C3%A3o%20e%20Setup) | Instalação local e ambiente de produção |
| [Guia de Execução Local](docs/04%20-%20Guia%20de%20Execu%C3%A7%C3%A3o%20Local) | Como baixar e rodar o projeto a partir do GitHub |
| [Documentação do Banco de Dados](docs/05%20-%20Database) | Modelo de dados, segurança e funções |

## Estrutura do projeto

```
CITO/
├── app/          Back-end (FastAPI, arquitetura hexagonal)
├── frontend/     Front-end (React via CDN) e arquivos estáticos
├── docs/         Documentação do projeto
├── scripts/      Utilitários e scripts SQL
├── run.py        Inicializador local (back-end + front-end)
└── pyproject.toml
```

## Privacidade e conformidade

O CITO trata dados sensíveis de saúde e foi construído em conformidade com a **LGPD**: os dados pessoais
são cifrados em repouso, cada profissional acessa apenas os próprios pacientes, o acesso é autenticado
e auditável, e as estatísticas agregadas aplicam k-anonimato para evitar reidentificação.

## Licença

Software proprietário. Todos os direitos reservados. O uso, a cópia e a distribuição são restritos aos
termos definidos pela equipe do projeto.

## Equipe

Projeto desenvolvido por Rhyan Rocha, Pedro Maraski, João Vitor de Souza, Augusto Neon e Nathan N.
