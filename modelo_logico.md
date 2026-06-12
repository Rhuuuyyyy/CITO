# Modelo Lógico

As tabelas de log e auditoria (`tb_log_sessoes`, `tb_log_tentativas_login`, `tb_log_analises`, `tb_auditoria`) são incluídas aqui por completude estrutural; no modelo conceitual foram omitidas por não pertencerem ao domínio de negócio.

---

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

---

## tb_pacientes

| Atributo | Tipo Lógico | Restrição | Descrição |
|---|---|---|---|
| id | Inteiro | PK, Not Null | Identificador do paciente |
| nome_criptografado | Binário | Not Null | Nome cifrado (PGP) |
| cpf_hash | Texto | Unique | Hash SHA-256 do CPF |
| data_nascimento | Data | Not Null | Data de nascimento |
| sexo | Caractere | Not Null | `M`, `F` ou `I` |
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

---

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

---

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
- `acompanhante_id` → `tb_acompanhantes.id` | Cardinalidade: N:1 (Modelo B — acompanhante por visita)

---

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

---

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

> A chave primária é composta por `avaliacao_id` + `sintoma_id`, garantindo que cada sintoma apareça uma única vez por avaliação. O relacionamento N:M entre `tb_avaliacoes` e `sintomas` é resolvido por esta tabela.

---

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

> Não possui chaves estrangeiras. A associação com `sintomas` e `tb_avaliacoes` ocorre por valor do campo `sexo`, dentro da função `fn_calcular_score_triagem`.

---

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

---

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

---

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

---

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
| tipo_encerramento | Texto | — | `logout`, `timeout`, etc. |
| duracao_segundos | Inteiro | — | Duração calculada |

**Chaves estrangeiras:**
- `usuario_id` → `usuarios.id` | Cardinalidade: N:1

---

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

---

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
| duracao_segundos | Inteiro | — | Duração calculada |
| score_gerado | Decimal | — | Escore calculado |
| recomendou_exame | Booleano | — | Resultado da triagem |

**Chaves estrangeiras:**
- `avaliacao_id` → `tb_avaliacoes.id` | Cardinalidade: N:1
- `usuario_id` → `usuarios.id` | Cardinalidade: N:1
- `sessao_id` → `tb_log_sessoes.id` | Cardinalidade: N:1

---

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
