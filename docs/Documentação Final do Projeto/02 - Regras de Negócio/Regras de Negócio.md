# Documento de Regras de Negócio

## Sistema CITO — Ferramenta de Pré-diagnóstico da Síndrome do X Frágil

Este documento descreve formalmente as regras que governam o comportamento do sistema CITO. O ponto de partida foi a especificação de integração (`docs/spec/SPEC.md`), mas cada regra foi verificada e complementada contra o código-fonte real, o esquema do banco de dados e a camada de domínio, de modo a refletir o sistema como ele efetivamente opera hoje — e não apenas como foi planejado. Cada regra cita o limiar, validação, exceção ou restrição concreta que a faz cumprir.

# 1. Contexto e escopo clínico

A Síndrome do X Frágil (SXF/FXS) é a causa hereditária mais comum de deficiência intelectual e a causa monogênica mais comum de autismo, decorrente de mutação no gene FMR1. O diagnóstico definitivo é molecular (teste do FMR1).

**RN-01 — Natureza de pré-diagnóstico.** O CITO realiza triagem (pré-diagnóstico), não diagnóstico. O desfecho do sistema é a recomendação de encaminhamento ao exame genético FMR1 (`recomenda_exame`), nunca um veredito diagnóstico. Esta premissa orienta todas as demais regras.

# 2. Cadastro de paciente

Endpoint: `POST /api/v1/pacientes`. Caso de uso: `RegisterPatientUseCase`. Schema: `PatientCreateRequest`.

**RN-02 — Campos obrigatórios do paciente.** São obrigatórios apenas `nome`, `data_nascimento` e `sexo`. Todos os campos demográficos (etnia, UF, escolaridade, comorbidades, medicamentos, prematuridade, etc.) são opcionais, pois o banco permite NULL. Esta regra resultou de decisão registrada na especificação: o formulário do front-end não coleta vários campos, e exigi-los quebraria o cadastro.

**RN-03 — Validações de formato do paciente.** O schema `PatientCreateRequest` (Pydantic, `extra="forbid"`) impõe: `nome` entre 2 e 120 caracteres; `sexo` restrito ao padrão `^(M|F|I)$`; `cpf` opcional, entre 11 e 14 caracteres; `uf_nascimento` e `uf_residencia` com no máximo 2 caracteres; `municipio_residencia` com no máximo 120. Qualquer campo não previsto no schema faz a requisição falhar com HTTP 422.

**RN-04 — CPF nunca é armazenado; apenas seu hash.** O objeto de valor `CPF` valida que o número contém exatamente 11 dígitos numéricos (após remover pontos, traços e espaços); caso contrário, lança `ValueError` com a mensagem "CPF inválido: deve conter exatamente 11 dígitos numéricos". Apenas o hash SHA-256 do CPF (`cpf_hash`) é persistido — o número em si nunca é gravado. O hash permite verificar duplicidade por igualdade sem guardar o dado. Adicionalmente, o `CPF` redige a si mesmo em representações textuais (`__repr__`/`__str__` retornam `***redacted***`), de modo que o número nunca aparece em log ou *traceback*.

**RN-05 — Cifragem do nome no banco, não na aplicação.** O repositório insere o nome do paciente em claro na view `pacientes`. O gatilho `INSTEAD OF INSERT` (`fn_pacientes_insert`) aplica `pgp_sym_encrypt` e grava o resultado cifrado (BYTEA) em `tb_pacientes.nome_criptografado`. A aplicação Python nunca cifra nada.

**RN-06 — Deduplicação do acompanhante por CPF.** O bloco `acompanhante` é opcional; quando presente, exige `nome` (2 a 120 caracteres) e `relacao` (1 a 40 caracteres). Se o acompanhante informado já existe (mesmo `cpf_hash`), o cadastro **reaproveita** o registro existente; sem CPF, sempre cria um novo. Isso reflete a realidade de que um mesmo responsável pode cuidar de vários pacientes.

**RN-07 — A relação do acompanhante vira grau de parentesco do paciente.** O grau de parentesco ("Mãe", "Pai", etc.) é enviado dentro do bloco `acompanhante` (campo `relacao`), mas é armazenado na coluna `grau_parentesco` do paciente, conforme a modelagem do banco.

**RN-08 — Identidade inteira atribuída pelo banco.** A entidade `Patient` nasce com `id = None`; o INSERT é feito sem id e usa `RETURNING id`, e o identificador `SERIAL` gerado pelo banco é então fixado na entidade. Identificadores são inteiros sequenciais, não UUID.

# 3. Listagem, prontuário e ciclo de vida do paciente

**RN-09 — Escopo por médico dono (RBAC de aplicação).** Toda consulta de pacientes é filtrada por `WHERE criado_por = :usuario_id` (o `usuario_id` vem do JWT). Um médico só enxerga e manipula os pacientes que ele cadastrou. Como os identificadores são sequenciais e, portanto, adivinháveis, esse filtro por dono é a defesa contra acesso indevido a objetos (IDOR) e é obrigatório em qualquer consulta nova.

**RN-10 — Limite de paginação.** A listagem de pacientes aceita `limit` entre 1 e 200 (padrão 50) e `offset` ≥ 0. O mesmo teto de 200 vale para o histórico de avaliações.

**RN-11 — Busca por nome é feita no servidor.** Como o nome pode não estar disponível em claro no cliente, a busca textual usa `ILIKE` no servidor (a view decifra o nome antes da comparação). O front-end envia o filtro via parâmetro `?nome=` com *debounce*.

**RN-12 — Acesso ao prontuário restrito ao dono.** O detalhe de um paciente (`GET /pacientes/{id}`) só é retornado se o paciente pertencer ao médico autenticado (`WHERE p.id = :id AND p.criado_por = :usuario_id`). Caso contrário, o sistema responde HTTP 404 "Paciente não encontrado" — sem distinguir entre inexistência e pertencimento a outro médico.

**RN-13 — Exclusão lógica (arquivamento).** `PATCH /pacientes/{id}` arquiva (`ativo = FALSE`) ou reativa (`ativo = TRUE`) um paciente do próprio médico. Pacientes arquivados são omitidos da listagem por padrão; só aparecem quando se informa `incluir_inativos=true`. Se o paciente não pertencer ao médico, o caso de uso lança `NotFoundError` (HTTP 404).

**RN-14 — Exclusão definitiva exige confirmação por senha.** `DELETE /pacientes/{id}` remove o paciente e todos os registros dependentes em cascata (avaliações, respostas, histórico familiar, encaminhamentos, logs de análise, agendamentos). A operação é confirmada com a senha do próprio médico requisitante. **Senha incorreta resulta em HTTP 422 (`DomainError` "Senha incorreta."), nunca em HTTP 401** — decisão deliberada, pois o front-end trata 401 como expiração de sessão e deslogaria o usuário. Antes de excluir, o sistema verifica também o pertencimento (`belongs_to`), respondendo 404 se o paciente não for do médico.

**RN-15 — Foto do paciente.** O upload de foto (`POST /pacientes/{id}/foto`) aceita uma imagem em base64, validada (base64 inválido resulta em 422), e a grava no sistema de arquivos em `frontend/assets/uploads/paciente_{id}.jpg`. A foto só pode ser enviada/removida para pacientes do próprio médico (verificado via detalhe; 404 caso contrário). A exclusão definitiva do paciente também remove sua foto.

# 4. Submissão de anamnese e cálculo do escore

Endpoint: `POST /api/v1/avaliacoes`. Caso de uso: `SubmitAnamnesisUseCase`. Schema: `SubmitAnamnesisRequest`.

**RN-16 — Submissão consolidada e atômica.** A finalização de uma triagem ocorre em um único endpoint e em uma única transação. O fluxo persiste, em sequência: a avaliação (rascunho), o acompanhante da visita, o registro de análise, as respostas do checklist e o histórico familiar; em seguida calcula o escore; cria o encaminhamento quando recomendado; e registra a auditoria. Qualquer falha desfaz a transação inteira (rollback).

**RN-17 — O checklist não pode ser vazio.** O campo `respostas` exige `min_length=1`: ao menos uma resposta de sintoma deve ser enviada, ou a validação falha com HTTP 422. Cada resposta tem `sintoma_id` ≥ 1, `presente` (booleano) e `observacao` opcional (máx. 500 caracteres).

**RN-18 — O escore é calculado no banco de dados.** A regra de escore não está em Python. O `SymptomScoringOrchestrator` apenas executa `SELECT * FROM fn_calcular_score_triagem(:avaliacao_id)`. A função do banco lê as respostas, multiplica cada sintoma presente pelo peso correspondente ao sexo do paciente, soma para obter o `score_final`, compara com o limiar vigente, registra a análise em `tb_log_analises` e atualiza `tb_avaliacoes` (mudando o `status` para `finalizada`). O back-end não duplica essa fórmula.

**RN-19 — Catálogo de sintomas e pesos por sexo.** O escore é a soma ponderada dos 12 sintomas marcados como presentes. Os pesos são calibrados separadamente para os sexos masculino e feminino, refletindo a manifestação clínica distinta da síndrome. Valores vigentes no banco:

| # | Sintoma | Peso M | Peso F | Exclusivo M |
|---|---------|:------:|:------:|:-----------:|
| 1 | Deficiência intelectual | 0.32 | 0.20 | — |
| 2 | Face alongada / orelhas salientes | 0.29 | 0.09 | — |
| 3 | Macroorquidismo | 0.26 | — | Sim |
| 4 | Hipermobilidade articular | 0.19 | 0.04 | — |
| 5 | Dificuldades de aprendizagem | 0.18 | 0.28 | — |
| 6 | Déficit de atenção | 0.17 | 0.12 | — |
| 7 | Movimentos repetitivos (estereotipias) | 0.17 | 0.05 | — |
| 8 | Atraso na fala | 0.14 | 0.01 | — |
| 9 | Hiperatividade | 0.12 | 0.04 | — |
| 10 | Evita contato visual | 0.06 | 0.08 | — |
| 11 | Evita contato físico | 0.04 | 0.07 | — |
| 12 | Agressividade | 0.01 | 0.02 | — |

O macroorquidismo, por ser exclusivamente masculino, não possui peso feminino. Note que alguns sintomas pesam mais no sexo feminino (por exemplo, "dificuldades de aprendizagem": 0.28 em F contra 0.18 em M).

**RN-20 — Limiares de decisão por sexo.** A recomendação de exame é determinada pela comparação do escore com um limiar específico do sexo, vindo da tabela `parametro_triagem` (linha ativa):

| Sexo | Limiar (`limiar_score`) | AUC | Sensibilidade | Versão do parâmetro |
|------|:-----------------------:|:---:|:-------------:|---------------------|
| M | 0.56 | 0.73 | 95% | ROMERO_2025_v1_M |
| F | 0.55 | 0.76 | 95% | ROMERO_2025_v1_F |

**RN-21 — Regra de decisão de `recomenda_exame`.** Calculada pela view `avaliacoes` e replicada conceitualmente na função de escore:

```
recomenda_exame =
    NULL                          se score_final ainda e NULL (avaliacao nao finalizada)
    false                         se diagnostico_previo_fxs = true
    score_final >= limiar(sexo)   caso contrario  (M: 0.56 · F: 0.55)
```

**RN-22 — Diagnóstico prévio suprime a recomendação, não o escore.** Se `diagnostico_previo_fxs` for verdadeiro, o escore ainda é calculado e registrado (para auditoria do modelo), mas `recomenda_exame` é forçado a `false` e, por consequência, nenhum encaminhamento automático é criado.

**RN-23 — Encaminhamento automático ao exame FMR1.** Quando, e somente quando, `recomenda_exame` é verdadeiro, o sistema cria automaticamente um encaminhamento do tipo `exame_fmr1` em `tb_encaminhamentos`, com `gerado_automaticamente = TRUE` e a justificativa "Score de triagem igual ou acima do limiar para o sexo do paciente.".

**RN-24 — Histórico familiar coletado uma vez por avaliação.** O histórico familiar é registrado uma única vez por avaliação (restrição UNIQUE em `tb_historico_familiar.avaliacao_id`). São oito achados hereditários booleanos — deficiência intelectual, falência ovariana precoce, autismo na família, epilepsia, infertilidade masculina, menopausa precoce, abortos recorrentes e tremor/ataxia familiar — mais um campo livre `descricao_outros` (máx. 500 caracteres). Esses achados refletem condições do espectro FMR1 em familiares.

**RN-25 — Hierarquia de criticidade das etapas.** As etapas de persistência do histórico familiar e de criação do encaminhamento são **fatais**: se falharem, a transação é desfeita. Já o registro de auditoria é **best-effort**: roda dentro de um SAVEPOINT com tratamento de exceção que absorve a falha, de modo que a indisponibilidade da função de auditoria não interrompe o fluxo clínico.

**RN-26 — Prévia de escore no cliente é apenas indicativa.** A tela de Triagem calcula um escore de prévia localmente (com os mesmos pesos e limiares) para antecipar o resultado ao médico antes do envio. O valor oficial, contudo, é sempre o devolvido pelo back-end. A prévia não substitui o cálculo do banco.

**RN-27 — Erro de banco no fluxo clínico vira HTTP 502.** Se qualquer etapa do fluxo de submissão lançar `RuntimeError` ou `ValueError` (por exemplo, um `RETURNING` vazio), o router converte o erro em HTTP 502 (Bad Gateway), com a mensagem de erro de banco.

# 5. Histórico, dashboard e relatórios

**RN-28 — Histórico de avaliações do paciente.** `GET /pacientes/{id}/historico` lista as avaliações de um paciente, com RBAC aplicado no JOIN (`WHERE a.paciente_id = :id AND p.criado_por = :usuario_id`). Uma lista vazia é resultado legítimo (paciente sem avaliações), não um erro.

**RN-29 — Resumo operacional do médico (sem anonimização).** `GET /dashboard/summary` retorna números exclusivos do médico autenticado: total de pacientes, avaliações de hoje, avaliações dos últimos 7 dias e a taxa de recomendação de exame (proporção de avaliações com `recomenda_exame = TRUE`, arredondada a 4 casas). Não há guarda de k-anonimato aqui, pois não há agregação entre pacientes de médicos diferentes.

**RN-30 — Estatísticas agregadas com guarda de k-anonimato (LGPD).** `GET /dashboard/stats` lê a view materializada anonimizada (`vw_dashboard_anonimizado`, sem dado pessoal) e aplica k-anonimato no nível de aplicação: se **qualquer** grupo agregado retornado tiver menos de 5 avaliações (`K_ANONYMITY_THRESHOLD = 5`), a resposta **inteira** é suprimida com `LGPDComplianceError` (HTTP 422). A medida impede a reidentificação de indivíduos em grupos pequenos (LGPD, Art. 12).

**RN-31 — Atualização da view materializada restrita a admin.** `POST /dashboard/refresh` executa `REFRESH MATERIALIZED VIEW CONCURRENTLY` e é permitido apenas a usuários com papel `admin` (HTTP 403 caso contrário).

**RN-32 — Relatórios não dependem de `recomenda_exame`.** `GET /relatorios/avaliacoes` devolve as avaliações finalizadas do médico com `data_avaliacao`, `score_final` e `sexo`, deixando o front-end computar o indicador de encaminhamento para os gráficos. Essa é a exceção consciente à dependência da coluna `recomenda_exame` (ADR-0005), preservando o comportamento de relatório legado.

# 6. Autenticação, sessão e segurança

**RN-33 — Login por OAuth2 password.** `POST /auth/login` recebe `username` e `password` em `application/x-www-form-urlencoded`. O e-mail é normalizado para minúsculas.

**RN-34 — Verificação de senha pelo PostgreSQL.** A senha é conferida pelo banco com `senha = crypt(:senha, senha)` (bcrypt nativo via `pgcrypto`), exigindo ainda `ativo = TRUE`. O Python nunca manipula o hash bcrypt. Credenciais inválidas resultam em HTTP 401 "Credenciais inválidas.".

**RN-35 — Proteção contra força bruta.** Antes de autenticar, o sistema conta as tentativas de login mal-sucedidas do IP de origem nos últimos 10 minutos; a partir de 5 falhas, responde HTTP 429 ("Muitas tentativas de login. Tente novamente em 10 minutos."). Toda tentativa, bem-sucedida ou não, é registrada em `tb_log_tentativas_login` (append-only), que é a base dessa contagem.

**RN-36 — Sessão auditável costurada ao token.** Em um login bem-sucedido, abre-se uma sessão em `tb_log_sessoes`, cujo `id` (BIGSERIAL) é o `sessao_id`. Esse identificador é embutido no JWT (claim `sid`), ligando o token a um registro de sessão rastreável. O token também carrega `sub` (usuario_id), `role`, `iat` e `exp`.

**RN-37 — Validade do token (TTL) de 30 minutos.** O JWT HS256 tem validade de 1800 segundos. A verificação confere a assinatura com `hmac.compare_digest` (resistente a ataque de temporização) e checa a expiração; qualquer falha resulta em HTTP 401.

**RN-38 — Papéis e autorização.** O papel no token reflete o tipo no banco: usuário `admin` recebe `role = 'admin'`; demais recebem `role = 'doctor'`. O guarda `get_current_doctor` aceita ambos os papéis; o guarda `get_current_admin` exige `admin` (HTTP 403 caso contrário). A ocultação do menu de administração no front-end é apenas conveniência de interface — a verdadeira barreira de acesso está no back-end.

**RN-39 — Logout.** `POST /auth/logout?sessao_id=` encerra a sessão correspondente, gravando `encerrada_em = NOW()` e `tipo_encerramento = 'logout'` em `tb_log_sessoes`.

# 7. Gestão de usuários (administração)

Endpoints sob `/usuarios`, todos restritos a administradores (`get_current_admin`).

**RN-40 — Criação de médico.** `POST /usuarios` cria um usuário do tipo `medico`. Validações do caso de uso: nome obrigatório; e-mail obrigatório (normalizado para minúsculas); senha com no mínimo 8 caracteres (`DomainError` caso contrário); e-mail único (`ConflictError` "Já existe um usuário com este e-mail." se já houver). A senha é cifrada com bcrypt na própria inserção (`crypt(:senha, gen_salt('bf'))`).

**RN-41 — Ativar/desativar usuário, sem auto-desativação.** `PATCH /usuarios/{id}` habilita ou desabilita um usuário (exclusão lógica). Um administrador **não pode desativar a própria conta** (`DomainError` "Você não pode desativar a própria conta.").

**RN-42 — Exclusão de usuário com salvaguardas.** `DELETE /usuarios/{id}` remove um usuário, confirmado com a senha do administrador requisitante. Regras: um administrador não pode excluir a própria conta (`DomainError`); senha incorreta resulta em HTTP 422 (não 401, pelo mesmo motivo da RN-14); e, se o usuário possuir registros clínicos ou de auditoria vinculados (violação de chave estrangeira), a exclusão é bloqueada com `ConflictError` (HTTP 409), recomendando a desativação em vez da exclusão para preservar a trilha clínica e de auditoria.

# 8. Proteção de dados pessoais (LGPD)

**RN-43 — Cifragem em repouso.** Os nomes de paciente e acompanhante são cifrados no banco com `pgp_sym_encrypt` (AES-256, via `pgcrypto`) e guardados como BYTEA. As views decifram em tempo de execução com `pgp_sym_decrypt`. O CPF nunca é guardado, apenas seu hash SHA-256 (RN-04).

**RN-44 — Chave de cifragem injetada por sessão.** A chave PGP nunca é armazenada no banco. É injetada por conexão, no início da sessão, por `SELECT set_config('app.pgp_key', :key, true)`; as views a leem com `current_setting('app.pgp_key')` para decifrar. A chave existe apenas em memória durante a conexão — mesmo com acesso ao armazenamento físico, os nomes permanecem ilegíveis sem ela.

**RN-45 — Mascaramento de CPF na borda.** A API nunca devolve o CPF em claro (de fato, só possui o hash). Onde o CPF apareceria, retorna-se o marcador fixo `CPF_MASK = "***.***.***-**"`.

**RN-46 — Exposição do nome ao médico dono.** O detalhe e a lista de pacientes retornam o nome decifrado ao médico que cadastrou o paciente, viabilizando a operação clínica (busca, prontuário, laudo). O utilitário `mask_name` (que exibe o primeiro nome e mascara os sobrenomes) está disponível na camada de apresentação como mecanismo de mascaramento de nome; no estado atual do código, o mascaramento efetivamente aplicado nas respostas é o do CPF, enquanto o nome do paciente é entregue em claro ao médico dono. Esta nota reflete o comportamento real do código.

**RN-47 — Trilhas de auditoria imutáveis.** O sistema mantém registros append-only que apoiam a prestação de contas exigida pela LGPD: `tb_log_sessoes` (ciclo de vida das sessões), `tb_log_tentativas_login` (tentativas de login), `tb_log_analises` (execuções de escore, com escore em claro para auditoria do modelo) e `tb_auditoria` (trilha geral de mutações, com estado anterior e novo em JSONB).

**RN-48 — Controle de acesso no banco (RBAC).** O acesso ao banco é segmentado em três papéis: `nivel_1` (aplicação) opera apenas pelas views e executa as funções; `nivel_2` (auditoria) tem leitura ampla; `nivel_3` (BI) lê as views clínicas e a view anonimizada. O Row Level Security está habilitado, e as políticas seguem essa segmentação. É por meio da restrição do `nivel_1` às views que se efetiva a regra "o back-end não toca nas tabelas físicas".

# 9. Quadro-resumo das regras

| Código | Regra | Aplicação concreta |
|--------|-------|--------------------|
| RN-01 | Pré-diagnóstico, não diagnóstico | Desfecho `recomenda_exame` |
| RN-03 | Validação de formato do paciente | Schema Pydantic `extra="forbid"`; sexo restrito a M, F ou I |
| RN-04 | CPF só como hash | `CPF` valida 11 dígitos; persiste `cpf_hash` SHA-256 |
| RN-06 | Acompanhante deduplicado por CPF | Reuso por `cpf_hash` |
| RN-09 | RBAC por médico dono | `WHERE criado_por = :usuario_id` |
| RN-14 | Exclusão confirma com senha; 422 se errada | `DomainError` "Senha incorreta." |
| RN-17 | Checklist não vazio | `respostas` `min_length=1` |
| RN-18 | Escore no banco | `fn_calcular_score_triagem` |
| RN-20 | Limiares por sexo | M 0.56 / F 0.55 (`parametro_triagem`) |
| RN-22 | Diagnóstico prévio suprime recomendação | view: `CASE WHEN diagnostico_previo_fxs THEN false` |
| RN-23 | Encaminhamento automático | `tipo='exame_fmr1'`, `gerado_automaticamente=TRUE` |
| RN-30 | k-anonimato nas estatísticas | `K_ANONYMITY_THRESHOLD = 5` → HTTP 422 |
| RN-35 | Anti-força bruta | 5 falhas / 10 min por IP → HTTP 429 |
| RN-37 | TTL do token | 1800 s (30 min) |
| RN-40 | Senha mínima de médico | 8 caracteres |
| RN-44 | Chave PGP por sessão | `set_config('app.pgp_key', ...)` |

# 10. Considerações finais

As regras aqui descritas são as que governam o comportamento observável do CITO no estado atual do código. Duas características merecem ênfase do ponto de vista de negócio. Primeiro, a regra clínica de maior valor — o escore e o limiar de decisão — reside no banco de dados, o que torna possível recalibrar o modelo (pesos e limiares) por meio de simples atualizações de dados, sem novo deploy de aplicação, e ainda preserva a auditabilidade de cada execução. Segundo, a proteção de dados pessoais não é um adendo, e sim uma propriedade transversal: ela aparece na cifragem em repouso, na chave por sessão, no mascaramento de CPF na borda, na supressão estatística por k-anonimato e nas trilhas de auditoria imutáveis. Onde o comportamento real do código diverge de uma intenção documentada — como no mascaramento de nome, hoje aplicado apenas ao CPF — o presente documento descreve o que o sistema efetivamente faz.
