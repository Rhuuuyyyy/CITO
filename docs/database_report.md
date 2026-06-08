# Documentação do Banco de Dados — SXF/CITO

**Projeto Supabase:** `znrsznscbmtudbcueana`
**Host:** `db.znrsznscbmtudbcueana.supabase.co`
**Motor:** PostgreSQL 14.5 (Supabase)

Esta é a documentação de referência do banco de dados do sistema CITO — plataforma de triagem para **Síndrome do X Frágil (FXS)**. Ela descreve o estado atual do banco: tabelas, relacionamentos, views, funções, métodos de criptografia e controle de acesso.

---

## 1. Visão Geral

O banco foi desenhado em torno de dois princípios: **conformidade com a LGPD** (dados pessoais cifrados em repouso) e **auditabilidade completa** (toda ação relevante deixa rastro). Para isso, os dados são organizados em três camadas:

| Camada | Objetos | Função |
|--------|---------|--------|
| **Física** (`tb_*`) | Tabelas que guardam dados cifrados (BYTEA) e hashes | Armazenamento bruto e protegido |
| **Lógica** (views) | Views que descriptografam em runtime | Interface de leitura e escrita do backend |
| **Relatório** | `vw_dashboard_anonimizado` | Dados agregados e anonimizados para BI |

O backend interage com o banco **exclusivamente pelas views** da camada lógica. As views aplicam a criptografia e descriptografia de forma transparente, de modo que a aplicação trabalha sempre com dados em claro, enquanto o armazenamento permanece cifrado.

### Extensões instaladas
- **`pgcrypto`** — criptografia PGP simétrica (AES-256) e funções de hash (SHA-256).
- **`pg_trgm`** — busca textual por similaridade (trigramas), usada em buscas de nomes e campos textuais.

### Resumo de objetos
| Tipo | Quantidade |
|------|-----------|
| Tabelas físicas | 13 |
| Views | 5 |
| Funções RPC expostas | 6 |
| Funções internas (triggers + auxiliares) | 5+ |
| Roles RBAC | 3 |

---

## 2. Tabelas Físicas

### 2.1 `usuarios`
Cadastro dos profissionais que operam o sistema (médicos e administradores). É a raiz de autoria de quase todas as outras tabelas — pacientes, avaliações e logs apontam de volta para o usuário que os criou.

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | SERIAL | PK | |
| `nome` | VARCHAR | ✓ | |
| `email` | VARCHAR | ✓ | UNIQUE — identificador de login |
| `crm` | VARCHAR | — | UNIQUE |
| `especialidade` | VARCHAR | — | |
| `senha` | TEXT | ✓ | Armazenada como hash bcrypt |
| `tipo` | VARCHAR | ✓ | CHECK: `medico`, `admin` |
| `ativo` | BOOLEAN | ✓ | Habilita/desabilita o acesso |
| `ultimo_acesso` | TIMESTAMP | — | |
| `criado_em` | TIMESTAMP | ✓ | |
| `atualizado_em` | TIMESTAMP | ✓ | Mantida por trigger |

A senha nunca é gravada em claro: o trigger `fn_hash_senha_usuario` aplica bcrypt automaticamente em todo INSERT/UPDATE da coluna `senha`.

---

### 2.2 `tb_pacientes`
Núcleo clínico e demográfico do paciente. O nome é cifrado e o CPF é guardado apenas como hash, de modo que nenhum dado identificável fica legível diretamente na tabela.

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | SERIAL | PK | |
| `nome_criptografado` | BYTEA | ✓ | Cifrado com `pgp_sym_encrypt` |
| `cpf_hash` | TEXT | — | SHA-256, UNIQUE |
| `data_nascimento` | DATE | ✓ | |
| `sexo` | CHAR(1) | ✓ | `M` ou `F` |
| `etnia` | VARCHAR | — | CHECK: branca, preta, parda, amarela, indigena, nao_declarado |
| `uf_nascimento` | CHAR(2) | — | |
| `municipio_residencia` | VARCHAR | — | |
| `uf_residencia` | CHAR(2) | — | |
| `prematuro` | BOOLEAN | — | |
| `idade_gestacional_semanas` | SMALLINT | — | Faixa válida: 20–45 |
| `peso_nascimento_gramas` | SMALLINT | — | |
| `escolaridade` | VARCHAR | — | |
| `tem_diagnostico_autismo` | BOOLEAN | ✓ | |
| `tem_diagnostico_tdah` | BOOLEAN | ✓ | |
| `outras_comorbidades` | TEXT | — | |
| `medicamentos_uso` | TEXT | — | |
| `acompanhante_id` | INTEGER | — | FK → `tb_acompanhantes.id` |
| `grau_parentesco` | VARCHAR | — | |
| `diagnostico_confirmado_fxs` | BOOLEAN | ✓ | |
| `ativo` | BOOLEAN | ✓ | Exclusão lógica (soft delete) |
| `criado_por` | INTEGER | — | FK → `usuarios.id` |
| `criado_em` | TIMESTAMP | ✓ | |
| `atualizado_em` | TIMESTAMP | ✓ | |

O `cpf_hash` permite verificar se um CPF já está cadastrado (lookup por igualdade) sem nunca armazenar o número em claro.

---

### 2.3 `tb_acompanhantes`
Responsável ou acompanhante vinculado ao paciente — tipicamente mãe, pai ou cuidador. Segue o mesmo padrão de proteção de `tb_pacientes`: nome cifrado, CPF apenas como hash.

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | SERIAL | PK | |
| `nome_criptografado` | BYTEA | ✓ | Cifrado com `pgp_sym_encrypt` |
| `cpf_hash` | TEXT | — | SHA-256, UNIQUE |
| `telefone` | VARCHAR | — | |
| `email` | VARCHAR | — | |
| `criado_em` | TIMESTAMP | ✓ | |
| `atualizado_em` | TIMESTAMP | ✓ | |

---

### 2.4 `tb_avaliacoes`
Registra cada sessão de triagem realizada sobre um paciente. Concentra o resultado do algoritmo (`score_final`) e o estado do fluxo de trabalho (`status`).

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | SERIAL | PK | |
| `paciente_id` | INTEGER | ✓ | FK → `tb_pacientes.id` |
| `usuario_id` | INTEGER | ✓ | FK → `usuarios.id` |
| `data_avaliacao` | TIMESTAMP | ✓ | |
| `diagnostico_previo_fxs` | BOOLEAN | ✓ | |
| `score_final` | NUMERIC | — | Score calculado pelo algoritmo de triagem |
| `observacoes` | TEXT | — | |
| `status` | VARCHAR | ✓ | CHECK: `rascunho`, `finalizada`, `cancelada` |
| `criado_em` | TIMESTAMP | ✓ | |
| `atualizado_em` | TIMESTAMP | ✓ | |

Uma avaliação começa como `rascunho`, recebe as respostas do checklist e o histórico familiar, e ao ser processada pela função de score passa a `finalizada` com o `score_final` preenchido.

---

### 2.5 `sintomas` — catálogo de triagem
Catálogo dos 12 sintomas avaliados, cada um com pesos calibrados separadamente para sexo masculino e feminino. É a base do cálculo de score.

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | SERIAL | PK | |
| `descricao` | VARCHAR | ✓ | Texto em PT-BR |
| `descricao_en` | VARCHAR | — | Texto em inglês |
| `peso` | NUMERIC | ✓ | Peso para sexo masculino |
| `peso_feminino` | NUMERIC | — | Peso para sexo feminino (NULL quando exclusivo masculino) |
| `exclusivo_masculino` | BOOLEAN | ✓ | Sintoma aplicável só a homens |
| `ativo` | BOOLEAN | ✓ | |

Pesos calibrados (valores no banco):

| # | Sintoma | Peso M | Peso F | Exclusivo M |
|---|---------|--------|--------|-------------|
| 1 | Deficiência intelectual | 0.32 | 0.20 | Não |
| 2 | Face alongada / orelhas salientes | 0.29 | 0.09 | Não |
| 3 | Macroorquidismo | 0.26 | — | **Sim** |
| 4 | Hipermobilidade articular | 0.19 | 0.04 | Não |
| 5 | Dificuldades de aprendizagem | 0.18 | 0.28 | Não |
| 6 | Déficit de atenção | 0.17 | 0.12 | Não |
| 7 | Movimentos repetitivos (estereotipias) | 0.17 | 0.05 | Não |
| 8 | Atraso na fala | 0.14 | 0.01 | Não |
| 9 | Hiperatividade | 0.12 | 0.04 | Não |
| 10 | Evita contato visual | 0.06 | 0.08 | Não |
| 11 | Evita contato físico | 0.04 | 0.07 | Não |
| 12 | Agressividade | 0.01 | 0.02 | Não |

O peso diferenciado por sexo reflete a forma como a síndrome se manifesta clinicamente de modo distinto entre homens e mulheres. O macroorquidismo, por ser exclusivamente masculino, não tem peso feminino.

---

### 2.6 `parametro_triagem`
Guarda os limiares de decisão do algoritmo de triagem. Manter esses valores no banco — e não no código — permite recalibrar o modelo sem alterar a aplicação.

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | SERIAL | PK | |
| `sexo` | CHAR(1) | ✓ | `M` ou `F` |
| `limiar_score` | NUMERIC | ✓ | Valor de corte para recomendar exame |
| `auc` | NUMERIC | — | Área sob a curva ROC do modelo |
| `sensibilidade` | NUMERIC | — | Sensibilidade do modelo |
| `versao` | VARCHAR | — | UNIQUE — ex.: `ROMERO_2025_v1_M` |
| `ativo` | BOOLEAN | ✓ | Indica o parâmetro vigente |
| `referencia` | TEXT | — | Citação bibliográfica de origem |
| `criado_em` | TIMESTAMP | ✓ | |

Parâmetros vigentes: **M** com limiar 0.56 (AUC 0.73, sensibilidade 95%) e **F** com limiar 0.55 (AUC 0.76, sensibilidade 95%). Quando o score de uma avaliação ultrapassa o limiar do sexo correspondente, o sistema recomenda o exame genético.

---

### 2.7 `respostas_checklist`
Liga cada avaliação aos sintomas, registrando a presença ou ausência de cada um. É a tabela associativa (N:M) entre `tb_avaliacoes` e `sintomas`.

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `avaliacao_id` | INTEGER | ✓ | PK + FK → `tb_avaliacoes.id` |
| `sintoma_id` | INTEGER | ✓ | PK + FK → `sintomas.id` |
| `presente` | BOOLEAN | ✓ | Sintoma observado ou não |
| `observacao` | VARCHAR | — | Nota livre do avaliador |

A chave primária composta (`avaliacao_id`, `sintoma_id`) garante que cada sintoma apareça uma única vez por avaliação.

---

### 2.8 `tb_historico_familiar`
Condições hereditárias relacionadas ao FXS, coletadas uma vez por avaliação. Cada coluna booleana corresponde a um achado familiar relevante para o pré-diagnóstico.

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | SERIAL | PK | |
| `avaliacao_id` | INTEGER | ✓ | FK → `tb_avaliacoes.id` |
| `deficiencia_intelectual` | BOOLEAN | ✓ | |
| `falencia_ovariana_precoce` | BOOLEAN | ✓ | |
| `autismo_na_familia` | BOOLEAN | ✓ | |
| `epilepsia` | BOOLEAN | ✓ | |
| `infertilidade_masculina` | BOOLEAN | ✓ | |
| `menopausa_precoce` | BOOLEAN | ✓ | |
| `abortos_recorrentes` | BOOLEAN | ✓ | |
| `tremor_ataxia_familiar` | BOOLEAN | ✓ | |
| `descricao_outros` | TEXT | — | |
| `criado_em` | TIMESTAMP | ✓ | |

---

### 2.9 `tb_encaminhamentos`
Encaminhamentos para especialidades ou exames, gerados ao final de uma avaliação. Podem ser criados automaticamente pelo sistema (com base no score) ou manualmente pelo profissional.

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | SERIAL | PK | |
| `avaliacao_id` | INTEGER | ✓ | FK → `tb_avaliacoes.id` |
| `tipo` | VARCHAR | — | CHECK: fonoaudiologia, psicologia, terapia_ocupacional, psiquiatria, neuropediatria, genetica_medica, exame_fmr1, fisioterapia, outro |
| `justificativa` | TEXT | — | |
| `gerado_automaticamente` | BOOLEAN | ✓ | Distingue encaminhamento do sistema vs. manual |
| `criado_em` | TIMESTAMP | ✓ | |

---

### 2.10 `tb_agendamentos`
Agenda de compromissos do sistema — consultas, retornos e demais eventos vinculados a pacientes e profissionais.

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | SERIAL | PK | |
| `paciente_id` | INTEGER | — | FK → `tb_pacientes.id` |
| `usuario_id` | INTEGER | — | FK → `usuarios.id` |
| `titulo` | VARCHAR | ✓ | |
| `tipo` | VARCHAR | — | |
| `data_hora` | TIMESTAMP | ✓ | Momento agendado |
| `status` | VARCHAR | ✓ | Estado do compromisso |
| `observacoes` | TEXT | — | |
| `criado_em` | TIMESTAMP | ✓ | |

---

## 3. Tabelas de Log e Auditoria

Estas tabelas registram o que acontece no sistema ao longo do tempo. As de auditoria são *append-only*: aceitam apenas INSERT, com UPDATE e DELETE revogados, garantindo um histórico imutável.

### 3.1 `tb_log_sessoes`
Ciclo de vida de cada sessão autenticada. O `id` desta tabela é o mesmo `sessao_id` carregado dentro do JWT, costurando o token de autenticação ao registro de sessão no banco.

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | BIGSERIAL | PK | Corresponde ao `sessao_id` do JWT |
| `usuario_id` | INTEGER | — | FK → `usuarios.id` |
| `token_sessao_hash` | TEXT | — | Hash do token de sessão |
| `ip_origem` | INET | — | |
| `user_agent` | TEXT | — | |
| `iniciada_em` | TIMESTAMP | ✓ | |
| `encerrada_em` | TIMESTAMP | — | |
| `tipo_encerramento` | VARCHAR | — | CHECK: logout, timeout, forcado, expirado |
| `duracao_segundos` | INTEGER | — | Coluna gerada (encerrada − iniciada) |

### 3.2 `tb_log_tentativas_login`
Toda tentativa de login, bem-sucedida ou não. É a base da proteção contra força bruta. *Append-only.*

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | BIGSERIAL | PK | |
| `email_tentado` | VARCHAR | ✓ | |
| `ip_origem` | INET | — | |
| `user_agent` | TEXT | — | |
| `sucesso` | BOOLEAN | ✓ | |
| `motivo_falha` | VARCHAR | — | CHECK: senha_incorreta, usuario_inativo, usuario_nao_encontrado, conta_bloqueada, token_invalido |
| `usuario_id` | INTEGER | — | FK → `usuarios.id` |
| `sessao_id` | BIGINT | — | FK → `tb_log_sessoes.id` |
| `tentado_em` | TIMESTAMP | ✓ | |

### 3.3 `tb_log_analises`
Auditoria de cada execução do algoritmo de score, com tempos de início e fim e o resultado gerado. Mantém o score em claro especificamente para fins de auditoria do modelo.

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | BIGSERIAL | PK | |
| `avaliacao_id` | INTEGER | ✓ | FK → `tb_avaliacoes.id` |
| `usuario_id` | INTEGER | — | FK → `usuarios.id` |
| `sessao_id` | BIGINT | — | FK → `tb_log_sessoes.id` |
| `iniciada_em` | TIMESTAMP | ✓ | |
| `finalizada_em` | TIMESTAMP | — | |
| `status_final` | VARCHAR | ✓ | |
| `duracao_segundos` | INTEGER | — | Coluna gerada |
| `score_gerado` | NUMERIC | — | Score em claro, para auditoria |
| `recomendou_exame` | BOOLEAN | — | |

### 3.4 `tb_auditoria`
Trilha geral de mutações no sistema. Cada entrada guarda o estado anterior e o novo em JSONB, permitindo reconstruir o histórico de qualquer registro. *Append-only.*

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | BIGSERIAL | PK | |
| `usuario_id` | INTEGER | — | FK → `usuarios.id` |
| `sessao_id` | BIGINT | — | FK → `tb_log_sessoes.id` |
| `acao` | VARCHAR | — | CHECK: PACIENTE_CRIADO, PACIENTE_EDITADO, AVALIACAO_FINALIZADA, SCORE_CALCULADO, … |
| `tabela_afetada` | VARCHAR | — | |
| `registro_id` | VARCHAR | — | |
| `dados_anteriores` | JSONB | — | Estado antes da mutação |
| `dados_novos` | JSONB | — | Estado após a mutação |
| `ip_address` | INET | — | |
| `criado_em` | TIMESTAMP | ✓ | |

---

## 4. Views — a camada lógica

As views são a interface que o backend usa para ler e gravar dados. Elas escondem a criptografia: ao consultar uma view, os campos cifrados chegam já descriptografados; ao gravar, um trigger `INSTEAD OF` cifra os dados antes de escrevê-los na tabela física correspondente.

### 4.1 `acompanhantes`
View sobre `tb_acompanhantes` que descriptografa o nome em leitura. O trigger `fn_acompanhantes_dml` intercepta INSERT/UPDATE/DELETE e cuida da cifragem na escrita.

### 4.2 `pacientes`
View sobre `tb_pacientes` com JOIN em `tb_acompanhantes`. Entrega o nome do paciente e do acompanhante já descriptografados, a idade calculada (`idade_anos`) e todos os campos demográficos. O trigger `fn_pacientes_dml` trata a escrita.

### 4.3 `avaliacoes`
View sobre `tb_avaliacoes` que expõe o `score_final` e o estado da avaliação. O trigger `fn_avaliacoes_dml` trata a escrita.

### 4.4 `vw_dashboard_anonimizado` (materializada)
View destinada a relatórios e BI, sem nenhum dado pessoal. Contém apenas agregações por sintoma, sexo, faixa de idade, etnia e UF.

| Coluna | Tipo |
|--------|------|
| `sintoma` | VARCHAR |
| `sexo` | CHAR |
| `idade_anos` | INTEGER |
| `etnia` | VARCHAR |
| `uf_residencia` | CHAR |
| `total_avaliacoes` | BIGINT |
| `total_presentes` | BIGINT |
| `prevalencia_pct` | NUMERIC |
| `versao_parametro` | VARCHAR |

### 4.5 `respostas_checklist`
As respostas do checklist são acessadas diretamente, sem uma view de descriptografia, por não conterem dados pessoais.

---

## 5. Funções e Triggers

### 5.1 Funções de negócio (RPC)
Chamáveis pela aplicação para executar a lógica de domínio dentro do banco.

| Função | Descrição |
|--------|-----------|
| `fn_calcular_score_triagem(avaliacao_id)` | Calcula o score, atualiza o status da avaliação e registra a análise nos logs |
| `fn_login(email, senha)` | Autentica o usuário, abre uma sessão e devolve o JWT |
| `fn_logout(sessao_id)` | Encerra a sessão e invalida o token |
| `fn_registrar_auditoria(...)` | Grava uma entrada na trilha `tb_auditoria` |
| `show_limit()` | Função interna do `pg_trgm` |
| `show_trgm(text)` | Função interna do `pg_trgm` |

**`fn_calcular_score_triagem`** é o coração da triagem. Retorna `TABLE(score_final, limiar_usado, recomenda_exame, versao_param)` e segue o fluxo: lê as respostas do checklist → multiplica cada sintoma presente pelo peso do sexo do paciente → soma para obter o score → compara com o `limiar_score` vigente em `parametro_triagem` → grava a análise em `tb_log_analises` e atualiza `tb_avaliacoes.score_final`.

### 5.2 Funções de trigger
Executadas automaticamente pelo banco para manter consistência e aplicar a criptografia.

| Função | Onde | Quando |
|--------|------|--------|
| `fn_hash_senha_usuario()` | `usuarios` | BEFORE INSERT/UPDATE da senha — aplica bcrypt |
| `fn_set_updated_at()` | Tabelas principais | BEFORE UPDATE — atualiza `atualizado_em` |
| `fn_pacientes_dml()` | View `pacientes` | INSTEAD OF — cifra antes de gravar |
| `fn_acompanhantes_dml()` | View `acompanhantes` | INSTEAD OF — cifra antes de gravar |
| `fn_avaliacoes_dml()` | View `avaliacoes` | INSTEAD OF — trata a escrita |

---

## 6. Criptografia e Proteção de Dados

A proteção de dados combina três técnicas, cada uma adequada a um propósito.

### 6.1 Cifragem reversível (PGP simétrico)
Usada em dados pessoais que precisam ser lidos de volta em claro. O algoritmo é `pgp_sym_encrypt` / `pgp_sym_decrypt` (AES-256, via `pgcrypto`).

| Tabela | Coluna | Conteúdo |
|--------|--------|----------|
| `tb_pacientes` | `nome_criptografado` | Nome do paciente |
| `tb_acompanhantes` | `nome_criptografado` | Nome do acompanhante |

### 6.2 Hash não reversível
Usado quando basta comparar valores por igualdade, sem precisar recuperar o original.

| Tabela | Coluna | Método | Propósito |
|--------|--------|--------|-----------|
| `tb_pacientes` | `cpf_hash` | SHA-256 | Lookup de CPF sem guardar o número |
| `tb_acompanhantes` | `cpf_hash` | SHA-256 | Lookup de CPF sem guardar o número |
| `tb_log_sessoes` | `token_sessao_hash` | SHA-256 | Validar token sem guardá-lo em claro |
| `usuarios` | `senha` | bcrypt | Autenticação de senha |

### 6.3 Chave de sessão e fluxo de descriptografia
A chave PGP **nunca é armazenada no banco**. Ela é injetada por conexão, no início da sessão, e fica disponível apenas durante aquela conexão. As views leem a chave de `current_setting('app.pgp_key')` no momento de descriptografar.

```
1. O usuário faz login → fn_login devolve um JWT contendo o sessao_id.
2. A cada conexão que vai tocar dados pessoais, o backend injeta a chave:
      SET app.pgp_key = '<chave-da-sessão>';
3. O backend consulta a view:
      SELECT * FROM pacientes WHERE id = $1;
4. A view executa pgp_sym_decrypt(nome_criptografado, current_setting('app.pgp_key'))
   e devolve o nome em claro.
5. Ao encerrar a conexão, a chave deixa de existir — nada cifrado fica
   acessível sem reinjetá-la.
```

Esse desenho garante que, mesmo com acesso ao armazenamento físico, os nomes permanecem ilegíveis sem a chave, que vive apenas em memória durante a sessão.

---

## 7. Controle de Acesso (RBAC)

O acesso é segmentado em três roles de banco, cada um com o mínimo de privilégios necessário à sua função.

| Role | Permissões | Uso |
|------|-----------|-----|
| `nivel_1` | SELECT/INSERT/UPDATE nas views + EXECUTE nas funções | API web (backend). Opera apenas pela camada lógica |
| `nivel_2` | SELECT em tabelas e views | Auditoria — leitura ampla, sem escrita |
| `nivel_3` | SELECT nas views clínicas e em `vw_dashboard_anonimizado` | BI e relatórios |

O role da aplicação (`nivel_1`) trabalha exclusivamente pelas views — é por meio dessa restrição que a regra "o backend não toca nas tabelas físicas" é efetivada. As tabelas têm Row Level Security habilitado, e as políticas seguem a segmentação por role descrita acima.

---

## 8. Mapa Rápido das Tabelas

| Tabela | Papel |
|--------|-------|
| `usuarios` | Profissionais que operam o sistema |
| `tb_pacientes` | Dados clínicos e demográficos do paciente (nome cifrado) |
| `tb_acompanhantes` | Responsável/cuidador do paciente (nome cifrado) |
| `tb_avaliacoes` | Sessões de triagem e seus scores |
| `sintomas` | Catálogo de 12 sintomas com pesos por sexo |
| `parametro_triagem` | Limiares de decisão do algoritmo |
| `respostas_checklist` | Presença de cada sintoma por avaliação |
| `tb_historico_familiar` | Achados hereditários por avaliação |
| `tb_encaminhamentos` | Encaminhamentos a especialidades/exames |
| `tb_agendamentos` | Agenda de compromissos |
| `tb_log_sessoes` | Ciclo de vida das sessões autenticadas |
| `tb_log_tentativas_login` | Histórico de tentativas de login |
| `tb_log_analises` | Auditoria das execuções de score |
| `tb_auditoria` | Trilha geral de mutações |
