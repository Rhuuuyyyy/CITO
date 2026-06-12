# Documentação do Banco de Dados — CITO

Banco de dados: PostgreSQL 17 (Supabase).
Backend: FastAPI + SQLAlchemy (async) + asyncpg. Arquitetura hexagonal.
---

## Sumário

1. Visão geral
2. Modelo conceitual
3. Modelo lógico
4. Modelo físico
5. Segurança, criptografia e funções
6. Considerações de evolução

---

# 1. Visão geral

O banco armazena o ciclo completo de uma triagem para Síndrome do X Frágil: cadastro de pacientes e acompanhantes, registro de avaliações clínicas, checklist de sintomas, cálculo automatizado de escore de risco, histórico familiar, encaminhamentos e agendamentos. Em paralelo, mantém uma camada de logs e auditoria para rastreabilidade de sessões, tentativas de login, execuções de análise e operações sobre dados clínicos.

Dados pessoais são protegidos por criptografia: nomes são cifrados com PGP simétrico, CPFs são armazenados apenas como hash e senhas usam bcrypt. A autenticação e o controle de acesso por perfil são tratados na camada de aplicação.

---

# 2. Modelo conceitual

Escopo: entidades do domínio clínico e de negócio.

## 2.1 Entidades e atributos

### Usuario
Profissional de saúde ou administrador com acesso ao sistema.

| Atributo | Descrição |
|---|---|
| id | Identificador |
| nome | Nome completo |
| email | E-mail de login (único) |
| crm | Registro profissional (único) |
| especialidade | Especialidade médica |
| senha | Credencial de acesso |
| tipo | Papel no sistema (`medico` ou `admin`) |
| ativo | Conta habilitada |
| ultimo_acesso | Data do último login |
| criado_em | Data de criação |
| atualizado_em | Última atualização |

### Paciente
Indivíduo submetido à triagem de SXF.

| Atributo | Descrição |
|---|---|
| id | Identificador |
| nome | Nome (criptografado) |
| cpf | CPF (armazenado como hash) |
| data_nascimento | Data de nascimento |
| sexo | `M` ou `F` |
| etnia | Autodeclaração de etnia |
| uf_nascimento | UF de nascimento |
| municipio_residencia | Município de residência |
| uf_residencia | UF de residência |
| prematuro | Nasceu prematuro |
| idade_gestacional_semanas | Semanas gestacionais |
| peso_nascimento_gramas | Peso ao nascer |
| escolaridade | Nível de escolaridade |
| tem_diagnostico_autismo | Diagnóstico de autismo |
| tem_diagnostico_tdah | Diagnóstico de TDAH |
| outras_comorbidades | Comorbidades adicionais |
| medicamentos_uso | Medicamentos em uso |
| diagnostico_confirmado_fxs | FXS confirmado |
| ativo | Exclusão lógica |

### Acompanhante
Responsável legal ou familiar do paciente.

| Atributo | Descrição |
|---|---|
| id | Identificador |
| nome | Nome (criptografado) |
| cpf | CPF (armazenado como hash) |
| telefone | Telefone de contato |
| email | E-mail de contato |

### Avaliacao
Registro de uma triagem clínica aplicada a um paciente.

| Atributo | Descrição |
|---|---|
| id | Identificador |
| data_avaliacao | Data da triagem |
| diagnostico_previo_fxs | FXS já confirmado anteriormente |
| score_final | Escore calculado |
| observacoes | Notas clínicas |
| status | `rascunho`, `finalizada` ou `cancelada` |

O atributo `grau_parentesco` pertence ao relacionamento entre `Avaliacao` e `Acompanhante` (acompanhante registrado por visita), não à entidade em si.

### Sintoma
Indicador clínico utilizado no checklist de triagem.

| Atributo | Descrição |
|---|---|
| id | Identificador |
| descricao | Descrição em português |
| descricao_en | Descrição em inglês |
| peso | Peso para sexo masculino |
| peso_feminino | Peso para sexo feminino |
| exclusivo_masculino | Aplicável só a homens |
| ativo | Sintoma em uso |

### RespostaChecklist *(entidade associativa)*
Resolve o relacionamento N:M entre `Avaliacao` e `Sintoma`. Cada instância representa a resposta de um sintoma específico dentro de uma avaliação.

| Atributo | Descrição |
|---|---|
| presente | Sintoma observado |
| observacao | Nota do médico |

### ParametroTriagem
Configuração estatística do algoritmo de triagem (limiares, AUC, sensibilidade).

| Atributo | Descrição |
|---|---|
| id | Identificador |
| sexo | `M` ou `F` |
| limiar_score | Limiar de decisão |
| auc | Área sob a curva ROC |
| sensibilidade | Sensibilidade do modelo |
| versao | Versão do parâmetro (única) |
| ativo | Parâmetro em uso |
| referencia | Citação bibliográfica |

Entidade independente — não possui relacionamento estrutural com as demais. A associação com `Sintoma` e `Avaliacao` ocorre por valor (`sexo`), dentro da função de cálculo de escore.

### HistoricoFamiliar
Antecedentes familiares relevantes para a triagem, vinculados a uma avaliação específica.

| Atributo | Descrição |
|---|---|
| id | Identificador |
| deficiencia_intelectual | Histórico familiar |
| falencia_ovariana_precoce | Histórico familiar |
| autismo_na_familia | Histórico familiar |
| epilepsia | Histórico familiar |
| infertilidade_masculina | Histórico familiar |
| menopausa_precoce | Histórico familiar |
| abortos_recorrentes | Histórico familiar |
| tremor_ataxia_familiar | Histórico familiar |
| descricao_outros | Outras condições |

### Encaminhamento
Indicação clínica gerada automaticamente ou pelo médico ao final de uma avaliação.

| Atributo | Descrição |
|---|---|
| id | Identificador |
| tipo | Especialidade ou exame |
| justificativa | Motivo do encaminhamento |
| gerado_automaticamente | Automático ou manual |

### Agendamento
Compromisso clínico associado a um paciente e/ou médico.

| Atributo | Descrição |
|---|---|
| id | Identificador |
| titulo | Título do agendamento |
| tipo | Tipo de compromisso |
| data_hora | Data e hora |
| status | Estado do compromisso |
| observacoes | Notas adicionais |

## 2.2 Relacionamentos

| Relacionamento | Entidades | Cardinalidade | Observação |
|---|---|---|---|
| cadastra | Usuario — Paciente | 1:N | Médico que registrou o paciente |
| realiza | Usuario — Avaliacao | 1:N | Médico responsável pela triagem |
| é submetido a | Paciente — Avaliacao | 1:N | Um paciente pode ter várias avaliações |
| acompanha (cadastro) | Acompanhante — Paciente | 1:N | Acompanhante atual do paciente |
| acompanha (visita) | Acompanhante — Avaliacao | 1:N | Acompanhante presente na visita; possui o atributo `grau_parentesco` |
| responde | Avaliacao — Sintoma | N:M | Resolvido por `RespostaChecklist` |
| possui | Avaliacao — HistoricoFamiliar | 1:0..1 | Uma avaliação tem no máximo um histórico familiar |
| gera | Avaliacao — Encaminhamento | 1:N | Uma avaliação pode gerar vários encaminhamentos |
| agenda | Paciente — Agendamento | 1:N | Opcional — agendamento pode não ter paciente vinculado |
| conduz | Usuario — Agendamento | 1:N | Opcional — agendamento pode não ter médico vinculado |

---

# 3. Modelo lógico

As tabelas de log e auditoria (`tb_log_sessoes`, `tb_log_tentativas_login`, `tb_log_analises`, `tb_auditoria`) são incluídas a partir deste nível por completude estrutural.

## usuarios

| Atributo | Tipo Lógico | Restrição | Descrição |
|---|---|---|---|
| id | Inteiro | PK, Not Null | Identificador do usuário |
| nome | Texto | Not Null | Nome completo |
| email | Texto | Unique, Not Null | E-mail de login |
| crm | Texto | Unique | Registro profissional |
| especialidade | Texto | — | Especialidade médica |
| senha | Texto | Not Null | Hash bcrypt da senha |
| tipo | Texto | — | `medico` ou `admin` |
| ativo | Booleano | Not Null | Conta habilitada |
| ultimo_acesso | Data/hora | — | Último login registrado |
| criado_em | Data/hora | Not Null | Data de criação |
| atualizado_em | Data/hora | Not Null | Última atualização |

## tb_pacientes

| Atributo | Tipo Lógico | Restrição | Descrição |
|---|---|---|---|
| id | Inteiro | PK, Not Null | Identificador do paciente |
| nome_criptografado | Binário | Not Null | Nome cifrado (PGP) |
| cpf_hash | Texto | Unique | Hash SHA-256 do CPF |
| data_nascimento | Data | Not Null | Data de nascimento |
| sexo | Caractere | Not Null | `M` ou `F` |
| etnia | Texto | — | Autodeclaração de etnia |
| uf_nascimento | Caractere | — | UF de nascimento |
| municipio_residencia | Texto | — | Município de residência |
| uf_residencia | Caractere | — | UF de residência |
| prematuro | Booleano | — | Nasceu prematuro |
| idade_gestacional_semanas | Inteiro pequeno | — | Semanas gestacionais |
| peso_nascimento_gramas | Inteiro pequeno | — | Peso ao nascer (g) |
| escolaridade | Texto | — | Nível de escolaridade |
| tem_diagnostico_autismo | Booleano | Not Null | Diagnóstico de autismo |
| tem_diagnostico_tdah | Booleano | Not Null | Diagnóstico de TDAH |
| outras_comorbidades | Texto longo | — | Comorbidades adicionais |
| medicamentos_uso | Texto longo | — | Medicamentos em uso |
| acompanhante_id | Inteiro | FK | Acompanhante atual |
| grau_parentesco | Texto | — | Relação com acompanhante |
| diagnostico_confirmado_fxs | Booleano | Not Null | FXS confirmado |
| ativo | Booleano | Not Null | Exclusão lógica |
| criado_por | Inteiro | FK | Médico que cadastrou |
| criado_em | Data/hora | Not Null | Data de criação |
| atualizado_em | Data/hora | Not Null | Última atualização |

**Chaves estrangeiras:**
- `acompanhante_id` → `tb_acompanhantes.id` | Cardinalidade: N:1
- `criado_por` → `usuarios.id` | Cardinalidade: N:1

## tb_acompanhantes

| Atributo | Tipo Lógico | Restrição | Descrição |
|---|---|---|---|
| id | Inteiro | PK, Not Null | Identificador do acompanhante |
| nome_criptografado | Binário | Not Null | Nome cifrado (PGP) |
| cpf_hash | Texto | Unique | Hash SHA-256 do CPF |
| telefone | Texto | — | Telefone de contato |
| email | Texto | — | E-mail de contato |
| criado_em | Data/hora | Not Null | Data de criação |
| atualizado_em | Data/hora | Not Null | Última atualização |

## tb_avaliacoes

| Atributo | Tipo Lógico | Restrição | Descrição |
|---|---|---|---|
| id | Inteiro | PK, Not Null | Identificador da avaliação |
| paciente_id | Inteiro | FK, Not Null | Paciente avaliado |
| usuario_id | Inteiro | FK, Not Null | Médico responsável |
| acompanhante_id | Inteiro | FK | Acompanhante desta visita |
| data_avaliacao | Data/hora | Not Null | Data da triagem |
| diagnostico_previo_fxs | Booleano | Not Null | FXS já confirmado |
| score_final | Decimal | — | Escore calculado |
| grau_parentesco | Texto | — | Relação nesta visita |
| observacoes | Texto longo | — | Notas clínicas |
| status | Texto | Not Null | `rascunho`, `finalizada` ou `cancelada` |
| criado_em | Data/hora | Not Null | Data de criação |
| atualizado_em | Data/hora | Not Null | Última atualização |

**Chaves estrangeiras:**
- `paciente_id` → `tb_pacientes.id` | Cardinalidade: N:1
- `usuario_id` → `usuarios.id` | Cardinalidade: N:1
- `acompanhante_id` → `tb_acompanhantes.id` | Cardinalidade: N:1 (acompanhante por visita)

## sintomas

| Atributo | Tipo Lógico | Restrição | Descrição |
|---|---|---|---|
| id | Inteiro | PK, Not Null | Identificador do sintoma |
| descricao | Texto | Not Null | Descrição em português |
| descricao_en | Texto | — | Descrição em inglês |
| peso | Decimal | Not Null | Peso para sexo masculino |
| peso_feminino | Decimal | — | Peso para sexo feminino |
| exclusivo_masculino | Booleano | Not Null | Aplicável só a homens |
| ativo | Booleano | Not Null | Sintoma em uso |

## respostas_checklist

| Atributo | Tipo Lógico | Restrição | Descrição |
|---|---|---|---|
| avaliacao_id | Inteiro | PK, FK, Not Null | Avaliação de referência |
| sintoma_id | Inteiro | PK, FK, Not Null | Sintoma respondido |
| presente | Booleano | Not Null | Sintoma observado |
| observacao | Texto | — | Nota do médico |

**Chaves estrangeiras:**
- `avaliacao_id` → `tb_avaliacoes.id` | Cardinalidade: N:1
- `sintoma_id` → `sintomas.id` | Cardinalidade: N:1

A chave primária é composta por `avaliacao_id` + `sintoma_id`, garantindo que cada sintoma apareça uma única vez por avaliação. O relacionamento N:M entre `tb_avaliacoes` e `sintomas` é resolvido por esta tabela.

## parametro_triagem

| Atributo | Tipo Lógico | Restrição | Descrição |
|---|---|---|---|
| id | Inteiro | PK, Not Null | Identificador do parâmetro |
| sexo | Caractere | Not Null | `M` ou `F` |
| limiar_score | Decimal | Not Null | Limiar de decisão |
| auc | Decimal | — | Área sob a curva ROC |
| sensibilidade | Decimal | — | Sensibilidade do modelo |
| versao | Texto | Unique | Versão do parâmetro |
| ativo | Booleano | Not Null | Parâmetro em uso |
| referencia | Texto longo | — | Citação bibliográfica |
| criado_em | Data/hora | Not Null | Data de criação |

Não possui chaves estrangeiras. A associação com `sintomas` e `tb_avaliacoes` ocorre por valor do campo `sexo`, dentro da função `fn_calcular_score_triagem`.

## tb_historico_familiar

| Atributo | Tipo Lógico | Restrição | Descrição |
|---|---|---|---|
| id | Inteiro | PK, Not Null | Identificador do registro |
| avaliacao_id | Inteiro | FK, Unique, Not Null | Avaliação de referência |
| deficiencia_intelectual | Booleano | Not Null | Histórico familiar |
| falencia_ovariana_precoce | Booleano | Not Null | Histórico familiar |
| autismo_na_familia | Booleano | Not Null | Histórico familiar |
| epilepsia | Booleano | Not Null | Histórico familiar |
| infertilidade_masculina | Booleano | Not Null | Histórico familiar |
| menopausa_precoce | Booleano | Not Null | Histórico familiar |
| abortos_recorrentes | Booleano | Not Null | Histórico familiar |
| tremor_ataxia_familiar | Booleano | Not Null | Histórico familiar |
| descricao_outros | Texto longo | — | Outras condições |
| criado_em | Data/hora | Not Null | Data de criação |

**Chaves estrangeiras:**
- `avaliacao_id` → `tb_avaliacoes.id` | Cardinalidade: 1:1 (UNIQUE garante no máximo um registro por avaliação)

## tb_encaminhamentos

| Atributo | Tipo Lógico | Restrição | Descrição |
|---|---|---|---|
| id | Inteiro | PK, Not Null | Identificador do encaminhamento |
| avaliacao_id | Inteiro | FK, Not Null | Avaliação de origem |
| tipo | Texto | — | Especialidade ou exame |
| justificativa | Texto longo | — | Motivo do encaminhamento |
| gerado_automaticamente | Booleano | Not Null | Automático ou manual |
| criado_em | Data/hora | Not Null | Data de criação |

**Chaves estrangeiras:**
- `avaliacao_id` → `tb_avaliacoes.id` | Cardinalidade: N:1

## tb_agendamentos

| Atributo | Tipo Lógico | Restrição | Descrição |
|---|---|---|---|
| id | Inteiro | PK, Not Null | Identificador do agendamento |
| paciente_id | Inteiro | FK | Paciente vinculado |
| usuario_id | Inteiro | FK | Médico responsável |
| titulo | Texto | Not Null | Título do agendamento |
| tipo | Texto | — | Tipo de compromisso |
| data_hora | Data/hora | Not Null | Data e hora |
| status | Texto | Not Null | Estado do compromisso |
| observacoes | Texto longo | — | Notas adicionais |
| criado_em | Data/hora | Not Null | Data de criação |

**Chaves estrangeiras:**
- `paciente_id` → `tb_pacientes.id` | Cardinalidade: N:1
- `usuario_id` → `usuarios.id` | Cardinalidade: N:1

## tb_log_sessoes

| Atributo | Tipo Lógico | Restrição | Descrição |
|---|---|---|---|
| id | Inteiro grande | PK, Not Null | Identificador da sessão |
| usuario_id | Inteiro | FK | Usuário autenticado |
| token_sessao_hash | Texto | — | Hash do token |
| ip_origem | Endereço IP | — | IP de origem |
| user_agent | Texto longo | — | Agente do navegador |
| iniciada_em | Data/hora | Not Null | Início da sessão |
| encerrada_em | Data/hora | — | Fim da sessão |
| tipo_encerramento | Texto | — | `logout`, `timeout`, `forcado` ou `expirado` |
| duracao_segundos | Inteiro | — | Duração calculada no encerramento |

**Chaves estrangeiras:**
- `usuario_id` → `usuarios.id` | Cardinalidade: N:1

## tb_log_tentativas_login

| Atributo | Tipo Lógico | Restrição | Descrição |
|---|---|---|---|
| id | Inteiro grande | PK, Not Null | Identificador da tentativa |
| email_tentado | Texto | Not Null | E-mail informado |
| ip_origem | Endereço IP | — | IP de origem |
| user_agent | Texto longo | — | Agente do navegador |
| sucesso | Booleano | Not Null | Login bem-sucedido |
| motivo_falha | Texto | — | Causa da falha |
| usuario_id | Inteiro | FK | Usuário (se encontrado) |
| sessao_id | Inteiro grande | FK | Sessão aberta |
| tentado_em | Data/hora | Not Null | Data da tentativa |

**Chaves estrangeiras:**
- `usuario_id` → `usuarios.id` | Cardinalidade: N:1
- `sessao_id` → `tb_log_sessoes.id` | Cardinalidade: N:1

## tb_log_analises

| Atributo | Tipo Lógico | Restrição | Descrição |
|---|---|---|---|
| id | Inteiro grande | PK, Not Null | Identificador do log |
| avaliacao_id | Inteiro | FK, Not Null | Avaliação processada |
| usuario_id | Inteiro | FK | Médico responsável |
| sessao_id | Inteiro grande | FK | Sessão ativa |
| iniciada_em | Data/hora | Not Null | Início do cálculo |
| finalizada_em | Data/hora | — | Fim do cálculo |
| status_final | Texto | Not Null | Estado do processamento |
| duracao_segundos | Inteiro | — | Duração calculada na finalização |
| score_gerado | Decimal | — | Escore calculado |
| recomendou_exame | Booleano | — | Resultado da triagem |

**Chaves estrangeiras:**
- `avaliacao_id` → `tb_avaliacoes.id` | Cardinalidade: N:1
- `usuario_id` → `usuarios.id` | Cardinalidade: N:1
- `sessao_id` → `tb_log_sessoes.id` | Cardinalidade: N:1

## tb_auditoria

| Atributo | Tipo Lógico | Restrição | Descrição |
|---|---|---|---|
| id | Inteiro grande | PK, Not Null | Identificador do registro |
| usuario_id | Inteiro | FK | Usuário que agiu |
| sessao_id | Inteiro grande | FK | Sessão ativa |
| acao | Texto | — | Ação executada |
| tabela_afetada | Texto | — | Tabela modificada |
| registro_id | Texto | — | ID do registro afetado |
| dados_anteriores | JSON | — | Estado antes da ação |
| dados_novos | JSON | — | Estado após a ação |
| ip_address | Endereço IP | — | IP de origem |
| criado_em | Data/hora | Not Null | Data da ação |

**Chaves estrangeiras:**
- `usuario_id` → `usuarios.id` | Cardinalidade: N:1
- `sessao_id` → `tb_log_sessoes.id` | Cardinalidade: N:1

---

# 4. Modelo físico

Implementação real no schema `public`. Os tipos e restrições abaixo refletem o estado atual do banco. As colunas de data usam `TIMESTAMP` (sem fuso horário).

## 4.1 Tabelas

### usuarios

```sql
CREATE TABLE usuarios (
    id              SERIAL      PRIMARY KEY,
    nome            VARCHAR     NOT NULL,
    email           VARCHAR     NOT NULL UNIQUE,
    crm             VARCHAR     UNIQUE,
    especialidade   VARCHAR,
    senha           TEXT        NOT NULL,
    tipo            VARCHAR     CHECK (tipo IN ('medico', 'admin')),
    ativo           BOOLEAN     NOT NULL DEFAULT true,
    ultimo_acesso   TIMESTAMP,
    criado_em       TIMESTAMP   NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMP   NOT NULL DEFAULT now()
);
```

### tb_acompanhantes

```sql
CREATE TABLE tb_acompanhantes (
    id                  SERIAL      PRIMARY KEY,
    nome_criptografado  BYTEA       NOT NULL,
    cpf_hash            TEXT        UNIQUE,
    telefone            VARCHAR,
    email               VARCHAR,
    criado_em           TIMESTAMP   NOT NULL DEFAULT now(),
    atualizado_em       TIMESTAMP   NOT NULL DEFAULT now()
);
```

### tb_pacientes

```sql
CREATE TABLE tb_pacientes (
    id                          SERIAL      PRIMARY KEY,
    nome_criptografado          BYTEA       NOT NULL,
    cpf_hash                    TEXT        UNIQUE,
    data_nascimento             DATE        NOT NULL CHECK (data_nascimento <= CURRENT_DATE),
    sexo                        CHAR(1)     NOT NULL CHECK (sexo IN ('M', 'F')),
    etnia                       VARCHAR     CHECK (etnia IN (
                                                'branca', 'preta', 'parda',
                                                'amarela', 'indigena', 'nao_declarado')),
    uf_nascimento               CHAR(2),
    municipio_residencia        VARCHAR,
    uf_residencia               CHAR(2),
    prematuro                   BOOLEAN,
    idade_gestacional_semanas   SMALLINT    CHECK (idade_gestacional_semanas BETWEEN 20 AND 45),
    peso_nascimento_gramas      SMALLINT,
    escolaridade                VARCHAR     CHECK (escolaridade IN (
                                                'sem_escolaridade', 'educacao_infantil',
                                                'fundamental_incompleto', 'fundamental_completo',
                                                'medio_incompleto', 'medio_completo',
                                                'superior_incompleto', 'superior_completo',
                                                'nao_informado')),
    tem_diagnostico_autismo     BOOLEAN     NOT NULL DEFAULT false,
    tem_diagnostico_tdah        BOOLEAN     NOT NULL DEFAULT false,
    outras_comorbidades         TEXT,
    medicamentos_uso            TEXT,
    acompanhante_id             INTEGER     REFERENCES tb_acompanhantes(id),
    grau_parentesco             VARCHAR,
    diagnostico_confirmado_fxs  BOOLEAN     NOT NULL DEFAULT false,
    ativo                       BOOLEAN     NOT NULL DEFAULT true,
    criado_por                  INTEGER     REFERENCES usuarios(id),
    criado_em                   TIMESTAMP   NOT NULL DEFAULT now(),
    atualizado_em               TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX idx_pacientes_cpf_hash      ON tb_pacientes (cpf_hash);
CREATE INDEX idx_pacientes_acompanhante  ON tb_pacientes (acompanhante_id);
CREATE INDEX idx_pacientes_criado_por    ON tb_pacientes (criado_por);
```

### tb_avaliacoes

```sql
CREATE TABLE tb_avaliacoes (
    id                      SERIAL      PRIMARY KEY,
    paciente_id             INTEGER     NOT NULL REFERENCES tb_pacientes(id),
    usuario_id              INTEGER     NOT NULL REFERENCES usuarios(id),
    acompanhante_id         INTEGER     REFERENCES tb_acompanhantes(id),
    data_avaliacao          TIMESTAMP   NOT NULL DEFAULT now(),
    diagnostico_previo_fxs  BOOLEAN     NOT NULL DEFAULT false,
    score_final             NUMERIC,
    grau_parentesco         VARCHAR,
    observacoes             TEXT,
    status                  VARCHAR     NOT NULL DEFAULT 'rascunho'
                                        CHECK (status IN ('rascunho', 'finalizada', 'cancelada')),
    criado_em               TIMESTAMP   NOT NULL DEFAULT now(),
    atualizado_em           TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX idx_avaliacoes_paciente ON tb_avaliacoes (paciente_id);
CREATE INDEX idx_avaliacoes_usuario  ON tb_avaliacoes (usuario_id);
```

### sintomas

```sql
CREATE TABLE sintomas (
    id                  SERIAL      PRIMARY KEY,
    descricao           VARCHAR     NOT NULL,
    descricao_en        VARCHAR,
    peso                NUMERIC     NOT NULL,
    peso_feminino       NUMERIC,
    exclusivo_masculino BOOLEAN     NOT NULL DEFAULT false,
    ativo               BOOLEAN     NOT NULL DEFAULT true
);
```

### respostas_checklist

```sql
CREATE TABLE respostas_checklist (
    avaliacao_id    INTEGER     NOT NULL REFERENCES tb_avaliacoes(id),
    sintoma_id      INTEGER     NOT NULL REFERENCES sintomas(id),
    presente        BOOLEAN     NOT NULL,
    observacao      VARCHAR,
    PRIMARY KEY (avaliacao_id, sintoma_id)
);

CREATE INDEX idx_respostas_sintoma ON respostas_checklist (sintoma_id);
```

### parametro_triagem

```sql
CREATE TABLE parametro_triagem (
    id              SERIAL      PRIMARY KEY,
    sexo            CHAR(1)     NOT NULL CHECK (sexo IN ('M', 'F')),
    limiar_score    NUMERIC     NOT NULL,
    auc             NUMERIC,
    sensibilidade   NUMERIC,
    versao          VARCHAR     UNIQUE,
    ativo           BOOLEAN     NOT NULL DEFAULT true,
    referencia      TEXT,
    criado_em       TIMESTAMP   NOT NULL DEFAULT now()
);

-- Garante no máximo um parâmetro ativo por sexo
CREATE UNIQUE INDEX uq_parametro_ativo_por_sexo
    ON parametro_triagem (sexo)
    WHERE ativo;
```

### tb_historico_familiar

```sql
CREATE TABLE tb_historico_familiar (
    id                          SERIAL      PRIMARY KEY,
    avaliacao_id                INTEGER     NOT NULL UNIQUE REFERENCES tb_avaliacoes(id),
    deficiencia_intelectual     BOOLEAN     NOT NULL DEFAULT false,
    falencia_ovariana_precoce   BOOLEAN     NOT NULL DEFAULT false,
    autismo_na_familia          BOOLEAN     NOT NULL DEFAULT false,
    epilepsia                   BOOLEAN     NOT NULL DEFAULT false,
    infertilidade_masculina     BOOLEAN     NOT NULL DEFAULT false,
    menopausa_precoce           BOOLEAN     NOT NULL DEFAULT false,
    abortos_recorrentes         BOOLEAN     NOT NULL DEFAULT false,
    tremor_ataxia_familiar      BOOLEAN     NOT NULL DEFAULT false,
    descricao_outros            TEXT,
    criado_em                   TIMESTAMP   NOT NULL DEFAULT now()
);
```

A restrição `UNIQUE` em `avaliacao_id` impõe a cardinalidade 1:1 com `tb_avaliacoes`.

### tb_encaminhamentos

```sql
CREATE TABLE tb_encaminhamentos (
    id                      SERIAL      PRIMARY KEY,
    avaliacao_id            INTEGER     NOT NULL REFERENCES tb_avaliacoes(id),
    tipo                    VARCHAR     CHECK (tipo IN (
                                            'fonoaudiologia', 'psicologia',
                                            'terapia_ocupacional', 'psiquiatria',
                                            'neuropediatria', 'genetica_medica',
                                            'exame_fmr1', 'fisioterapia', 'outro')),
    justificativa           TEXT,
    gerado_automaticamente  BOOLEAN     NOT NULL DEFAULT true,
    criado_em               TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX idx_encaminhamentos_aval ON tb_encaminhamentos (avaliacao_id);
```

### tb_agendamentos

```sql
CREATE TABLE tb_agendamentos (
    id          SERIAL      PRIMARY KEY,
    paciente_id INTEGER     REFERENCES tb_pacientes(id),
    usuario_id  INTEGER     REFERENCES usuarios(id),
    titulo      VARCHAR     NOT NULL,
    tipo        VARCHAR,
    data_hora   TIMESTAMP   NOT NULL,
    status      VARCHAR     NOT NULL DEFAULT 'confirmado'
                            CHECK (status IN (
                                'confirmado', 'aguardando', 'em_atendimento',
                                'pendente', 'cancelado')),
    observacoes TEXT,
    criado_em   TIMESTAMP   NOT NULL DEFAULT now()
);
```

### tb_log_sessoes

```sql
CREATE TABLE tb_log_sessoes (
    id                  BIGSERIAL   PRIMARY KEY,
    usuario_id          INTEGER     REFERENCES usuarios(id),
    token_sessao_hash   TEXT,
    ip_origem           INET,
    user_agent          TEXT,
    iniciada_em         TIMESTAMP   NOT NULL DEFAULT now(),
    encerrada_em        TIMESTAMP,
    tipo_encerramento   VARCHAR     CHECK (tipo_encerramento IN (
                                        'logout', 'timeout', 'forcado', 'expirado')),
    duracao_segundos    INTEGER     DEFAULT (
                            CASE WHEN encerrada_em IS NOT NULL
                                 THEN EXTRACT(epoch FROM (encerrada_em - iniciada_em))::integer
                            END)
);

CREATE INDEX idx_log_sessoes_usuario ON tb_log_sessoes (usuario_id);
```

### tb_log_tentativas_login

```sql
CREATE TABLE tb_log_tentativas_login (
    id              BIGSERIAL   PRIMARY KEY,
    email_tentado   VARCHAR     NOT NULL,
    ip_origem       INET,
    user_agent      TEXT,
    sucesso         BOOLEAN     NOT NULL,
    motivo_falha    VARCHAR     CHECK (motivo_falha IN (
                                    'senha_incorreta', 'usuario_inativo',
                                    'usuario_nao_encontrado', 'conta_bloqueada',
                                    'token_invalido')),
    usuario_id      INTEGER     REFERENCES usuarios(id),
    sessao_id       BIGINT      REFERENCES tb_log_sessoes(id),
    tentado_em      TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_ip ON tb_log_tentativas_login (ip_origem, tentado_em);
```

### tb_log_analises

```sql
CREATE TABLE tb_log_analises (
    id                  BIGSERIAL   PRIMARY KEY,
    avaliacao_id        INTEGER     NOT NULL REFERENCES tb_avaliacoes(id),
    usuario_id          INTEGER     REFERENCES usuarios(id),
    sessao_id           BIGINT      REFERENCES tb_log_sessoes(id),
    iniciada_em         TIMESTAMP   NOT NULL DEFAULT now(),
    finalizada_em       TIMESTAMP,
    status_final        VARCHAR     NOT NULL DEFAULT 'em_andamento'
                                    CHECK (status_final IN (
                                        'concluida', 'cancelada',
                                        'timeout', 'em_andamento')),
    duracao_segundos    INTEGER     DEFAULT (
                            CASE WHEN finalizada_em IS NOT NULL
                                 THEN EXTRACT(epoch FROM (finalizada_em - iniciada_em))::integer
                            END),
    score_gerado        NUMERIC,
    recomendou_exame    BOOLEAN
);

CREATE INDEX idx_log_analises_aval ON tb_log_analises (avaliacao_id);
```

### tb_auditoria

```sql
CREATE TABLE tb_auditoria (
    id                  BIGSERIAL   PRIMARY KEY,
    usuario_id          INTEGER     REFERENCES usuarios(id),
    sessao_id           BIGINT      REFERENCES tb_log_sessoes(id),
    acao                VARCHAR     CHECK (acao IN (
                                        'PACIENTE_CRIADO', 'PACIENTE_EDITADO', 'PACIENTE_DESATIVADO',
                                        'AVALIACAO_CRIADA', 'AVALIACAO_FINALIZADA', 'SCORE_CALCULADO',
                                        'ACOMPANHANTE_CRIADO', 'ACOMPANHANTE_EDITADO',
                                        'USUARIO_CRIADO', 'USUARIO_EDITADO', 'EXPORTACAO')),
    tabela_afetada      VARCHAR,
    registro_id         VARCHAR,
    dados_anteriores    JSONB,
    dados_novos         JSONB,
    ip_address          INET,
    criado_em           TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX idx_auditoria_usuario ON tb_auditoria (usuario_id);
```

## 4.2 Views

### pacientes

View de leitura sobre `tb_pacientes`. Calcula a idade em anos, traz os dados do acompanhante por `LEFT JOIN` e descriptografa o nome em tempo de consulta.

```sql
CREATE VIEW pacientes AS
SELECT
    p.id,
    p.nome_criptografado,
    p.cpf_hash,
    p.data_nascimento,
    date_part('year', age(p.data_nascimento::timestamp))::integer AS idade_anos,
    p.sexo,
    p.etnia,
    p.uf_nascimento,
    p.municipio_residencia,
    p.uf_residencia,
    p.prematuro,
    p.idade_gestacional_semanas,
    p.peso_nascimento_gramas,
    p.escolaridade,
    p.tem_diagnostico_autismo,
    p.tem_diagnostico_tdah,
    p.outras_comorbidades,
    p.medicamentos_uso,
    p.acompanhante_id,
    p.grau_parentesco,
    a.nome_criptografado AS acompanhante_nome_criptografado,
    a.telefone           AS acompanhante_telefone,
    a.email              AS acompanhante_email,
    p.diagnostico_confirmado_fxs,
    p.ativo,
    p.criado_por,
    p.criado_em,
    p.atualizado_em,
    pgp_sym_decrypt(p.nome_criptografado, current_setting('app.pgp_key', true)) AS nome
FROM tb_pacientes p
LEFT JOIN tb_acompanhantes a ON a.id = p.acompanhante_id;
```

A inserção pela view é interceptada pelo gatilho `trg_pacientes_insert` (INSTEAD OF), que aplica a criptografia do nome e direciona o registro para `tb_pacientes`.

### acompanhantes

View de leitura sobre `tb_acompanhantes` com descriptografia transparente do nome.

```sql
CREATE VIEW acompanhantes AS
SELECT
    id,
    nome_criptografado,
    cpf_hash,
    telefone,
    email,
    criado_em,
    atualizado_em,
    pgp_sym_decrypt(nome_criptografado, current_setting('app.pgp_key', true)) AS nome
FROM tb_acompanhantes;
```

A inserção é interceptada pelo gatilho `trg_acompanhantes_insert` (INSTEAD OF), com o mesmo padrão de criptografia.

### avaliacoes

View sobre `tb_avaliacoes` que adiciona a coluna calculada `recomenda_exame`, comparando o `score_final` com o limiar do parâmetro ativo correspondente ao sexo do paciente. Não expõe o acompanhante da visita — esse dado é lido diretamente de `tb_avaliacoes` pela aplicação.

```sql
CREATE VIEW avaliacoes AS
SELECT
    id,
    paciente_id,
    usuario_id,
    data_avaliacao,
    diagnostico_previo_fxs,
    score_final,
    observacoes,
    status,
    criado_em,
    atualizado_em,
    CASE
        WHEN score_final IS NULL THEN NULL
        WHEN diagnostico_previo_fxs THEN false
        WHEN score_final >= (
            SELECT pt.limiar_score
            FROM parametro_triagem pt
            WHERE pt.ativo
              AND pt.sexo = (
                  SELECT pac.sexo
                  FROM tb_pacientes pac
                  WHERE pac.id = a.paciente_id)
            LIMIT 1
        ) THEN true
        ELSE false
    END AS recomenda_exame
FROM tb_avaliacoes a;
```

### vw_dashboard_anonimizado *(materializada)*

View materializada que agrega estatísticas de prevalência de sintomas por estrato demográfico (sintoma, sexo, idade em anos, etnia, UF de residência e versão do parâmetro). Considera apenas avaliações com status `finalizada`. Não expõe identificadores diretos (nome, CPF) — apenas contagens e percentuais agregados.

```sql
CREATE MATERIALIZED VIEW vw_dashboard_anonimizado AS
SELECT
    s.descricao AS sintoma,
    p.sexo,
    date_part('year', age(p.data_nascimento::timestamp))::integer AS idade_anos,
    p.etnia,
    p.uf_residencia,
    count(rc.avaliacao_id) AS total_avaliacoes,
    sum(CASE WHEN rc.presente THEN 1 ELSE 0 END) AS total_presentes,
    round(
        100.0 * sum(CASE WHEN rc.presente THEN 1 ELSE 0 END)::numeric
        / NULLIF(count(rc.avaliacao_id), 0)::numeric, 2
    ) AS prevalencia_pct,
    pt.versao AS versao_parametro
FROM respostas_checklist rc
JOIN tb_avaliacoes a    ON a.id = rc.avaliacao_id AND a.status = 'finalizada'
JOIN tb_pacientes p     ON p.id = a.paciente_id
JOIN sintomas s         ON s.id = rc.sintoma_id
JOIN parametro_triagem pt ON pt.sexo = p.sexo AND pt.ativo = true
GROUP BY s.descricao, p.sexo, idade_anos, p.etnia, p.uf_residencia, pt.versao;

-- Índice único: permite refresh concorrente e impõe unicidade dos agregados
CREATE UNIQUE INDEX uq_dash_anon
    ON vw_dashboard_anonimizado (sintoma, sexo, idade_anos, etnia, uf_residencia, versao_parametro);
```

## 4.3 Gatilhos

O banco possui seis gatilhos: dois `INSTEAD OF INSERT` nas views de cifragem e quatro `BEFORE UPDATE` para atualização automática do campo `atualizado_em`.

| Gatilho | Tabela / View | Evento | Timing | Função associada |
|---|---|---|---|---|
| `trg_pacientes_insert` | view `pacientes` | INSERT | INSTEAD OF | `fn_pacientes_insert` — cifra o nome e insere em `tb_pacientes` |
| `trg_acompanhantes_insert` | view `acompanhantes` | INSERT | INSTEAD OF | `fn_acompanhantes_insert` — cifra o nome e insere em `tb_acompanhantes` |
| `trg_pacientes_upd` | `tb_pacientes` | UPDATE | BEFORE | `fn_set_updated_at` |
| `trg_avaliacoes_upd` | `tb_avaliacoes` | UPDATE | BEFORE | `fn_set_updated_at` |
| `trg_acompanhantes_upd` | `tb_acompanhantes` | UPDATE | BEFORE | `fn_set_updated_at` |
| `trg_usuarios_upd` | `usuarios` | UPDATE | BEFORE | `fn_set_updated_at` |

O hash de senha e o registro de auditoria não são acionados por gatilhos — ocorrem na camada de aplicação (ver seções 5.2 e 5.3).

## 4.4 Integridade referencial

Todas as chaves estrangeiras usam a ação padrão `NO ACTION`, em delete e update. Na prática, isso impede a exclusão de um registro pai enquanto houver filhos referenciando-o. A exclusão em cascata, quando necessária, é tratada na camada de aplicação, pelo método `PatientRepository.delete_cascade`.

| FK | Tabela origem | Referencia | On delete / update |
|---|---|---|---|
| `acompanhante_id` | `tb_pacientes` | `tb_acompanhantes.id` | NO ACTION |
| `criado_por` | `tb_pacientes` | `usuarios.id` | NO ACTION |
| `paciente_id` | `tb_avaliacoes` | `tb_pacientes.id` | NO ACTION |
| `usuario_id` | `tb_avaliacoes` | `usuarios.id` | NO ACTION |
| `acompanhante_id` | `tb_avaliacoes` | `tb_acompanhantes.id` | NO ACTION |
| `avaliacao_id` | `respostas_checklist` | `tb_avaliacoes.id` | NO ACTION |
| `sintoma_id` | `respostas_checklist` | `sintomas.id` | NO ACTION |
| `avaliacao_id` | `tb_historico_familiar` | `tb_avaliacoes.id` | NO ACTION |
| `avaliacao_id` | `tb_encaminhamentos` | `tb_avaliacoes.id` | NO ACTION |
| `paciente_id` | `tb_agendamentos` | `tb_pacientes.id` | NO ACTION |
| `usuario_id` | `tb_agendamentos` | `usuarios.id` | NO ACTION |
| `usuario_id` | `tb_log_sessoes` | `usuarios.id` | NO ACTION |
| `usuario_id` | `tb_log_tentativas_login` | `usuarios.id` | NO ACTION |
| `sessao_id` | `tb_log_tentativas_login` | `tb_log_sessoes.id` | NO ACTION |
| `avaliacao_id` | `tb_log_analises` | `tb_avaliacoes.id` | NO ACTION |
| `usuario_id` | `tb_log_analises` | `usuarios.id` | NO ACTION |
| `sessao_id` | `tb_log_analises` | `tb_log_sessoes.id` | NO ACTION |
| `usuario_id` | `tb_auditoria` | `usuarios.id` | NO ACTION |
| `sessao_id` | `tb_auditoria` | `tb_log_sessoes.id` | NO ACTION |

---

# 5. Segurança, criptografia e funções

## 5.1 Extensões

| Extensão | Finalidade |
|---|---|
| `pgcrypto` | Criptografia PGP simétrica (`pgp_sym_encrypt/decrypt`) e bcrypt (`crypt`, `gen_salt`) |
| `pg_trgm` | Similaridade de texto para buscas aproximadas |
| `uuid-ossp` | Geração de identificadores UUID |
| `pg_stat_statements` | Estatísticas de execução de consultas |
| `supabase_vault` | Cofre de segredos do Supabase |
| `plpgsql` | Linguagem procedural das funções e gatilhos |

As extensões diretamente usadas pelo domínio são `pgcrypto` (criptografia) e `pg_trgm` (busca); as demais são padrão do ambiente Supabase.

## 5.2 Criptografia de dados pessoais

### Nomes

As colunas `nome_criptografado` em `tb_pacientes` e `tb_acompanhantes` armazenam o nome cifrado com PGP simétrico (AES-256) via `pgp_sym_encrypt`, em colunas do tipo `BYTEA`.

A chave de criptografia não é persistida no banco. É injetada na sessão pela aplicação antes de cada operação:

```sql
SET app.pgp_key = '<chave>';
```

As views `pacientes` e `acompanhantes` descriptografam o valor em tempo de consulta:

```sql
pgp_sym_decrypt(nome_criptografado, current_setting('app.pgp_key', true)) AS nome
```

Quando a chave não está presente na sessão, `current_setting` retorna `NULL` (efeito do segundo argumento `true`) e o campo `nome` resulta em `NULL`, sem lançar erro.

### CPF

O CPF não é armazenado em texto. A coluna `cpf_hash` recebe o digest SHA-256, calculado na camada de aplicação antes do envio ao banco. O hash serve apenas para verificação de duplicidade, garantida pela restrição `UNIQUE`. Não é possível recuperar o CPF original a partir do hash.

### Senhas

As senhas são armazenadas como hash bcrypt na coluna `usuarios.senha`. O cálculo do hash é feito pela camada de aplicação antes da inserção; não há gatilho no banco aplicando bcrypt automaticamente. A verificação no login compara o hash via `crypt`:

```sql
v_user.senha <> crypt(p_senha, v_user.senha)
```

## 5.3 Funções de negócio

### fn_calcular_score_triagem

```
fn_calcular_score_triagem(p_avaliacao_id integer)
RETURNS TABLE(score_final numeric, limiar_usado numeric, recomenda_exame boolean, versao_param varchar)
```

Calcula o escore de triagem de uma avaliação e persiste o resultado.

1. Obtém o sexo do paciente e a existência de diagnóstico prévio de FXS.
2. Recupera o `limiar_score` e a `versao` do `parametro_triagem` ativo para aquele sexo.
3. Soma os pesos dos sintomas marcados como presentes no checklist, usando `peso` para sexo masculino e `peso_feminino` para feminino; sintomas exclusivos do sexo masculino são ignorados para pacientes do sexo feminino.
4. Define `recomenda_exame` como verdadeiro quando o escore atinge o limiar e não há diagnóstico prévio.
5. Atualiza `tb_avaliacoes` com o escore e muda o `status` para `finalizada`.
6. Atualiza o registro correspondente em `tb_log_analises`.
7. Retorna o escore, o limiar usado, a recomendação e a versão do parâmetro.

### fn_login

```
fn_login(p_email text, p_senha text, p_user_agent text DEFAULT NULL)
RETURNS TABLE(id integer, nome varchar, email varchar, tipo varchar, crm varchar, sessao_id bigint)
SECURITY DEFINER
```

Autentica o usuário e abre uma sessão.

1. Busca o usuário pelo e-mail normalizado em minúsculas.
2. Registra tentativa malsucedida em `tb_log_tentativas_login` nos casos de usuário inexistente, conta inativa ou senha incorreta.
3. Em caso de sucesso, abre registro em `tb_log_sessoes`, registra a tentativa bem-sucedida, atualiza `ultimo_acesso` e retorna os dados do usuário com o identificador da sessão.
4. Um retorno vazio indica falha de autenticação.

O atributo `SECURITY DEFINER` é necessário para que a função leia o hash da senha em `usuarios` independentemente do perfil que a invoca.

### fn_logout

```
fn_logout(p_sessao_id bigint)
RETURNS void
SECURITY DEFINER
```

Encerra a sessão: define `encerrada_em` e `tipo_encerramento = 'logout'` na linha correspondente de `tb_log_sessoes`, apenas se a sessão ainda estiver aberta.

### fn_registrar_auditoria

```
fn_registrar_auditoria(
    p_usuario_id integer, p_sessao_id bigint, p_acao varchar,
    p_tabela varchar, p_registro_id varchar,
    p_antes jsonb DEFAULT NULL, p_depois jsonb DEFAULT NULL)
RETURNS void
SECURITY DEFINER
```

Insere um registro em `tb_auditoria`. É invocada explicitamente pela camada de aplicação nos pontos em que se deseja registrar uma ação (por exemplo, ao finalizar uma avaliação). Não é disparada automaticamente por gatilhos DML. Os parâmetros `p_antes` e `p_depois` recebem o estado do registro antes e depois da operação, em formato JSONB.

## 5.4 Controle de acesso

A autenticação e a autorização por perfil são realizadas na camada de aplicação (FastAPI), por middleware JWT, antes de qualquer operação no banco. Não há políticas de Row Level Security (RLS) definidas. O estado do RLS por tabela é o seguinte:

| Tabela | RLS habilitado | Políticas |
|---|---|---|
| `tb_pacientes` | Não | — |
| `tb_avaliacoes` | Não | — |
| `tb_acompanhantes` | Não | — |
| `tb_historico_familiar` | Não | — |
| `tb_encaminhamentos` | Não | — |
| `tb_agendamentos` | Não | — |
| `sintomas` | Não | — |
| `parametro_triagem` | Não | — |
| `usuarios` | Não | — |
| `tb_log_sessoes` | Sim | Nenhuma |
| `tb_log_tentativas_login` | Sim | Nenhuma |
| `tb_log_analises` | Sim | Nenhuma |
| `tb_auditoria` | Sim | Nenhuma |

Nas tabelas de log, o RLS está habilitado sem políticas — configuração que nega acesso a perfis que não sejam o proprietário. A escrita nessas tabelas ocorre pelas funções `SECURITY DEFINER`, que executam com privilégios do proprietário.

As views `pacientes`, `acompanhantes` e `avaliacoes` não têm a opção `security_invoker` habilitada. Como consequência, executam com as permissões do proprietário (`postgres`) em vez das permissões de quem consulta — o linter do Supabase sinaliza essa condição como "Security Definer view". Esse comportamento é necessário para que a descriptografia PGP, que depende do acesso à chave via `current_setting('app.pgp_key')`, funcione de forma consistente.

---

# 6. Considerações de evolução

Os pontos a seguir são lacunas conhecidas, aceitáveis no estágio atual do projeto, mas recomendadas para implementação em uma evolução do sistema.

## 6.1 Row Level Security nas tabelas clínicas

Atualmente o isolamento de dados depende inteiramente da camada de aplicação. Em um cenário de produção, recomenda-se habilitar RLS nas tabelas clínicas (`tb_pacientes`, `tb_avaliacoes` e relacionadas), propagando o contexto de autenticação do FastAPI para o banco via `set_config('app.usuario_id', ...)` antes de cada consulta. Exemplo de política:

```sql
ALTER TABLE tb_pacientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY pacientes_por_criador ON tb_pacientes
    USING (criado_por = current_setting('app.usuario_id')::integer);
```

Isso adicionaria uma segunda camada de defesa, independente da aplicação.

## 6.2 Acionamento automático de hash e auditoria

O banco já contém as funções de gatilho `trg_hash_senha_usuario`, `trg_pacientes_dml` e `trg_avaliacoes_dml`, porém elas não estão acopladas a nenhum gatilho — hoje o hash de senha e o registro de auditoria dependem da aplicação chamá-los. Acoplar essas funções como gatilhos (`BEFORE INSERT/UPDATE` para o hash, `AFTER INSERT/UPDATE` para a auditoria) garantiria que a senha nunca seja gravada sem cifragem e que toda operação clínica gere trilha de auditoria, independentemente do caminho de acesso.

## 6.3 Anonimização por k-anonymity no dashboard

A view `vw_dashboard_anonimizado` agrega dados sem expor identificadores diretos, mas não impõe um tamanho mínimo de grupo. Estratos com poucos registros podem permitir reidentificação indireta. Recomenda-se adicionar um filtro de cardinalidade mínima na agregação, por exemplo:

```sql
HAVING count(rc.avaliacao_id) >= 5
```

garantindo que apenas grupos com cinco ou mais avaliações sejam expostos.

## 6.4 Integridade referencial e fuso horário

Dois ajustes estruturais reduziriam o risco de inconsistência futura:

- Adotar ações `ON DELETE` explícitas (CASCADE ou SET NULL, conforme a relação) nas chaves estrangeiras, em vez de tratar a cascata apenas na aplicação. Hoje todas as FKs usam `NO ACTION`, e uma falha no fluxo de exclusão da aplicação pode deixar registros órfãos.
- Padronizar as colunas de data para `TIMESTAMPTZ`. Atualmente são `TIMESTAMP` sem fuso, o que pode gerar ambiguidade em operações que envolvam horários de diferentes regiões.
