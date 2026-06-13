# Ata de Registro de Desenvolvimento

## Projeto CITO — Sistema de Triagem para a Síndrome do X Frágil

Registro do desenvolvimento do projeto CITO, organizado por sprints, com a síntese das atividades, dos commits e das funcionalidades entregues ao longo do período. Documento baseado no histórico de versionamento do repositório.

Período: 26 de maio de 2026 a 13 de junho de 2026 · Total de commits: 109 · Repositório: github.com/Rhuuuyyyy/CITO

# 1. Identificação

| Campo | Informação |
|-------|------------|
| Projeto | CITO — Ferramenta de pré-diagnóstico da Síndrome do X Frágil (SXF) |
| Período de desenvolvimento | 26/05/2026 a 13/06/2026 (aproximadamente 19 dias) |
| Total de commits registrados | 109 |
| Repositório | https://github.com/Rhuuuyyyy/CITO |
| Sistema em produção | citosina.com.br |

## 1.1 Equipe (contribuidores registrados no versionamento)

Os nomes abaixo constam como autores dos commits no histórico do repositório:

- Rhyan Rocha (rhyanhdr)
- Pedro Maraski
- João Vitor de Souza
- Augusto Neon / Augusto Ryba
- Nathan N.

> A organização e a redação de parte da documentação técnica contaram com apoio de ferramentas de automação.

# 2. Visão geral por sprints

| Sprint | Período | Foco principal |
|--------|---------|----------------|
| 0 | 26–27/05 | Fundação do projeto: estrutura, configuração, segurança e banco |
| 1 | 28/05–02/06 | Domínio (regras) e construção do front-end; laudo em PDF |
| 2 | 07–08/06 | Integração e construção do back-end em arquitetura hexagonal |
| 3 | 09–11/06 | Consolidação clínica, gestão e preparação para implantação |
| 4 | 12/06 | Recursos finais, relatórios e organização da documentação |
| 5 | 13/06 | Documentação formal, Hub de Links e refinamentos |

# 3. Detalhamento dos sprints

## Sprint 0 — Fundação do projeto (26–27 de maio)

Estabelecimento da base técnica do projeto.

- Estrutura inicial do repositório e do pacote da aplicação.
- Definição das dependências e do sistema de build (`pyproject.toml`).
- Configuração tipada da aplicação (classe `Settings`) e modelo de variáveis de ambiente (`.env.example`).
- Hierarquia de exceções de domínio.
- Mecanismo de **autenticação por JWT** (emissão e verificação de token, implementados com a biblioteca padrão).
- **Camada de banco de dados** assíncrona: engine, fábrica de sessões e injeção da chave de criptografia por sessão.

**Commits de destaque:** estrutura inicial; `Settings` e `get_settings()`; hierarquia de exceções; `security.py` (JWT); engine assíncrona e injeção da `pgp_key`.

## Sprint 1 — Domínio e front-end (28 de maio a 02 de junho)

Modelagem das regras de negócio e construção da interface.

- **Objeto de valor `CPF`** com validação, hash e proteção de privacidade (o CPF nunca é armazenado em texto).
- Entidades e enumerações do domínio (sintomas, usuário).
- **Front-end implementado** com as páginas Login, Dashboard, Agenda, Configurações, Triagem e Pacientes, além dos componentes compartilhados (Base, Calendário, Logo, Sidebar, alternador de tema e Topbar).
- **Geração do laudo em PDF** a partir dos dados da triagem, acionada pelo botão "gerar laudo".

**Commits de destaque:** objeto de valor `CPF`; entidades de domínio; implementação das páginas do front-end; função de geração do laudo em PDF.

## Sprint 2 — Integração e back-end hexagonal (07 e 08 de junho)

Período de maior volume de construção do servidor.

- Integração inicial do front-end ao banco (Supabase).
- Construção da **arquitetura hexagonal** do back-end:
  - Entidades de domínio (Paciente, Avaliação, Checklist, Acompanhante) e contratos de repositório.
  - **Casos de uso**: cadastro de paciente, histórico, listagem (com paginação e hash de CPF), estatísticas do dashboard com **k-anonimato (LGPD)** e o orquestrador de cálculo de score.
  - **Repositórios** de escrita e leitura.
  - **Serviço de autenticação** com proteção contra força bruta.
  - Schemas de validação, routers HTTP e o `main.py` (raiz de composição).
  - Integração entre banco, back-end e front-end.

**Commits de destaque:** entidades e ports; DTOs e casos de uso; repositórios; `AuthService` com anti-força-bruta; schemas e routers; `main.py`; integração db/back/front.

## Sprint 3 — Consolidação clínica e operacional (09 a 11 de junho)

Amadurecimento das funcionalidades e preparação para implantar.

- Triagem com **paciente já existente**, seleção de acompanhante e exibição do nome completo ao médico responsável.
- **Ficha completa do paciente** no prontuário.
- **Reimpressão de laudo**, **gestão de usuários**, **arquivar/excluir paciente** e **editar/excluir compromissos da agenda**.
- Substituição do script `start.bat` pelo **`run.py` multiplataforma** (inicialização automática).
- Preparação para implantação: `requirements.txt`, Gunicorn, o back-end passando a servir o front-end, e correções no endereço da API.
- **Parâmetros de score** ajustados, PDF atualizado e correções no fluxo de acompanhante.
- Finalização das telas de Configurações.

**Commits de destaque:** triagem com paciente existente; reimpressão de laudo e gestão de usuários; `run.py` multiplataforma; parâmetros de score e PDF.

## Sprint 4 — Recursos finais, relatórios e organização (12 de junho)

- **Upload de foto** do paciente e correções associadas (incluindo a "tela branca").
- Limpeza de código e remoção de arquivos desnecessários.
- **Relatórios com filtros** e exportação em PDF; edição de paciente; telefone do paciente; exibição do nome do usuário logado.
- Organização da documentação: pasta de banco de dados, vault de arquitetura (Obsidian) e reestruturação das pastas.
- Apresentação do projeto atualizada com vídeos.

**Commits de destaque:** upload de foto; filtros e PDF nos relatórios; organização das pastas de documentação; documentação de banco atualizada.

## Sprint 5 — Documentação formal e Hub (13 de junho)

- **Edição de acompanhante** no prontuário e **opção de excluir triagem**.
- Criação do **Hub de Links** (central de acesso rápido aos recursos do projeto).
- README transformado em **tutorial de uso** com banner, e posterior padronização.
- Consolidação do conjunto de **documentos formais**: Manual de Arquitetura, Regras de Negócio, Guia de Instalação e Setup, Guia de Execução Local, Documentação do Banco de Dados e o Manual de Uso.

**Commits de destaque:** edição de acompanhante; excluir triagem; Hub de Links; README e documentação formal.

# 4. Funcionalidades entregues (consolidado)

Ao final do período, o sistema reúne as seguintes funcionalidades:

| Área | Funcionalidades |
|------|-----------------|
| Acesso | Login com sessão, proteção contra força bruta, perfis de médico e administrador |
| Pacientes | Cadastro, edição, listagem com busca, prontuário completo, foto, arquivar e excluir |
| Triagem | Checklist de sinais, histórico familiar, cálculo de score, recomendação de exame e exclusão de triagem |
| Laudo | Geração e reimpressão do laudo em PDF |
| Agenda | Criação, edição e cancelamento de compromissos; reagendamento pela visão geral |
| Relatórios | Gráficos de atividade com filtros e exportação em PDF |
| Administração | Gestão de usuários (médicos) pelo administrador |
| Segurança/LGPD | Criptografia de dados pessoais, isolamento por profissional e k-anonimato nas estatísticas |

# 5. Documentação produzida

Além do código, o projeto produziu um conjunto de documentos:

- Manual de Arquitetura
- Regras de Negócio
- Guia de Instalação e Setup
- Guia de Execução Local
- Documentação do Banco de Dados
- Manual de Uso
- Hub de Links (central de acesso)
- Esta Ata de Registro de Desenvolvimento

# 6. Encerramento

Esta ata registra, de forma resumida, o percurso de desenvolvimento do CITO ao longo de 109 commits, entre 26 de maio e 13 de junho de 2026, contemplando desde a fundação técnica do projeto até a entrega do sistema em produção (citosina.com.br) e da documentação de apoio. O histórico completo e detalhado permanece disponível no versionamento do repositório.
