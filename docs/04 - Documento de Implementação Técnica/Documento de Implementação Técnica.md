# Documento de Implementação Técnica

## Sistema CITO — Ferramenta de Pré-diagnóstico da Síndrome do X Frágil

Este documento é um aprofundamento técnico sobre **como o sistema foi efetivamente construído**. Cobre as escolhas tecnológicas, a estratégia de criptografia, o mecanismo de autenticação, a implementação do escore clínico, a conformidade com a LGPD em cada camada, o modelo de comunicação do front-end e demais detalhes de implementação que um desenvolvedor recém-chegado precisaria conhecer para dominar o código. Todo o conteúdo foi verificado contra o código-fonte real.

# 1. Escolhas tecnológicas e suas razões

A pilha foi escolhida buscando simplicidade operacional e fidelidade ao banco de dados real, que já existia e impunha restrições.

| Decisão | Implementação | Razão |
|---------|---------------|-------|
| FastAPI + Pydantic v2 | `app/` | Validação declarativa, documentação automática (OpenAPI) e tipagem forte na borda |
| SQLAlchemy 2.0 assíncrono + asyncpg | `db/database.py`, repositórios | I/O não bloqueante; conexão preguiçosa permite importar o app sem banco |
| SQL bruto via `text()` (sem ORM declarativo) | `interfaces/repositories/` | O acesso é por views e funções do banco; o ORM declarativo agregaria pouco e esconderia a intenção |
| JWT HS256 com biblioteca padrão | `core/security.py` | Evita o problema de compatibilidade do pacote `cryptography` no host de hospedagem |
| React via CDN, sem empacotador | `frontend/` | Elimina a etapa de build e o *tooling* de front; transpila JSX no navegador com Babel Standalone |
| Lógica de escore no banco | `fn_calcular_score_triagem` | Fonte única da verdade; recalibração sem deploy; auditabilidade |

# 2. Configuração tipada

`app/core/config.py` centraliza toda a configuração em uma classe `Settings(BaseSettings)` de `pydantic-settings`, lida de variáveis de ambiente e do arquivo `.env`. A função `get_settings()` é cacheada com `@lru_cache` e injetável via `Depends`, garantindo uma instância única.

Dois cuidados de implementação merecem nota:

- `cors_origins` é anotado com `NoDecode` e validado por um `field_validator` em modo `before`, que aceita tanto JSON (`["http://a","http://b"]`) quanto CSV (`http://a,http://b`). Isso impede que o `pydantic-settings` tente fazer o *parse* de JSON antes da hora.
- `database_url` e `pgp_key` são do tipo `SecretStr`, de modo que não vazam em `repr` nem em log; lê-se o valor com `.get_secret_value()`. Os valores padrão existem apenas para permitir `import app.main` sem `.env` — em produção, devem ser sobrescritos.

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8",
                                      case_sensitive=False, extra="ignore")
    secret_key: str = Field(default="change-me-in-environment", min_length=8)
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)
    database_url: SecretStr = Field(default=SecretStr("postgresql+asyncpg://localhost/cito"))
    pgp_key: SecretStr = Field(default=SecretStr("change-me-pgp-key"))
```

# 3. Estratégia de criptografia

A proteção de dados combina três técnicas, cada uma adequada a um propósito. O ponto central é que **a aplicação Python não cifra nem decifra nada** — toda a criptografia ocorre no banco, de forma transparente, pelas views e gatilhos.

| Técnica | Onde | Para quê |
|---------|------|----------|
| PGP simétrico (AES-256, reversível) | `tb_pacientes.nome_criptografado`, `tb_acompanhantes.nome_criptografado` | Nomes (precisam ser lidos de volta) |
| SHA-256 (hash, irreversível) | `cpf_hash`, `token_sessao_hash` | Comparação por igualdade sem guardar o original |
| bcrypt | `usuarios.senha` | Autenticação de senha |

## 3.1 Cifragem reversível de nomes (PGP simétrico)

Os nomes são cifrados com `pgp_sym_encrypt` (AES-256, extensão `pgcrypto`) e guardados como BYTEA. A escrita acontece pela view: o repositório executa `INSERT INTO pacientes (nome, ...)` com o nome **em claro**, e o gatilho `INSTEAD OF INSERT` (`fn_pacientes_insert`) cifra o valor antes de gravar em `tb_pacientes.nome_criptografado`. A leitura é simétrica: a view aplica `pgp_sym_decrypt(nome_criptografado, current_setting('app.pgp_key'))` e devolve o nome em claro.

## 3.2 Hash irreversível de CPF

O CPF nunca é armazenado. O objeto de valor `CPF` (`domain/value_objects/cpf.py`) expõe `sha256_hex`, e apenas esse hash é persistido em `cpf_hash`. Isso viabiliza a busca por igualdade (detecção de duplicidade) sem guardar o número. O objeto valida 11 dígitos na construção e redige a si mesmo em representações textuais, evitando vazamento em log:

```python
@dataclass(frozen=True)
class CPF:
    value: str
    def __post_init__(self):
        cleaned = re.sub(r"[.\-\s]", "", self.value)
        if not cleaned.isdigit() or len(cleaned) != 11:
            raise ValueError("CPF inválido: deve conter exatamente 11 dígitos numéricos")
        object.__setattr__(self, "value", cleaned)
    @property
    def sha256_hex(self) -> str: ...
    def __repr__(self): return "CPF(***redacted***)"
    def __str__(self):  return "***redacted***"
```

## 3.3 A chave PGP injetada por sessão

A chave de descriptografia **nunca** é armazenada no banco. Ela é injetada por conexão, no início de cada sessão, em `db/database.py`:

```python
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionFactory() as session:
        await session.execute(
            text("SELECT set_config('app.pgp_key', :key, true)"),
            {"key": settings.pgp_key.get_secret_value()},
        )
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

As views leem a chave com `current_setting('app.pgp_key')` no momento de decifrar. A chave vive apenas em memória durante a conexão e some quando ela fecha. Mesmo com acesso ao armazenamento físico, os nomes permanecem ilegíveis sem a chave.

Esse trecho também concentra outras duas responsabilidades de implementação: a **unidade de trabalho** (a `AsyncSession` é injetada por requisição via `Depends`, fazendo `commit` ao final ou `rollback` em qualquer exceção — é o que dá atomicidade ao fluxo clínico) e a **conexão preguiçosa** (o asyncpg só conecta no primeiro uso, permitindo `import app.main` sem banco no ar).

# 4. Mecanismo de autenticação

## 4.1 JWT HS256 artesanal

`core/security.py` emite e verifica tokens JWT HS256 usando **apenas a biblioteca padrão** (`hmac`, `hashlib`, `base64`, `json`), sem PyJWT ou jose. A motivação, registrada no próprio arquivo, é evitar o problema de compatibilidade do pacote `cryptography` no host. Uma eventual migração para RS256 mexeria apenas neste arquivo.

O token carrega as claims `sub` (usuario_id), `role`, `sid` (sessao_id), `iat` e `exp`. O TTL é de **1800 segundos (30 minutos)**. A verificação confere a assinatura com `hmac.compare_digest` (resistente a ataque de temporização), valida a expiração e a presença das claims obrigatórias; qualquer falha levanta `JWTError`.

```python
def verify_access_token(token: str) -> TokenClaims:
    parts = token.split(".")
    if len(parts) != 3:
        raise JWTError("Malformed JWT: expected 3 parts")
    header, payload_b64, signature = parts
    expected_sig = _sign(f"{header}.{payload_b64}", _settings.secret_key)
    if not hmac.compare_digest(signature, expected_sig):
        raise JWTError("JWT signature verification failed")
    ...
```

## 4.2 Login, sessão e proteção contra força bruta

O `AuthService` (`services/auth_service.py`) coordena a autenticação com SQL direto. A verificação de senha é delegada ao PostgreSQL:

```python
SELECT id, tipo FROM usuarios
WHERE email = LOWER(:email)
  AND senha = crypt(:senha, senha)   -- bcrypt nativo do Postgres
  AND ativo = TRUE
```

O Python nunca manipula o hash bcrypt nem a senha além de repassá-la parametrizada. O fluxo de login, no router de autenticação, executa em ordem: extração de IP e *user agent*; verificação anti-força bruta (`check_brute_force` conta falhas do IP nos últimos 10 minutos — a partir de 5, retorna HTTP 429); autenticação; abertura de sessão em `tb_log_sessoes` (cujo `id` BIGSERIAL é o `sessao_id`); registro da tentativa em `tb_log_tentativas_login` (sempre, sucesso ou falha); e emissão do JWT. O papel embutido no token reflete o tipo do banco (`admin` → `admin`; demais → `doctor`).

## 4.3 O guarda de rotas

`interfaces/api/dependencies.py` define `get_current_doctor`, a dependência que protege quase todos os endpoints. Ela verifica o *Bearer token* de forma puramente criptográfica — **sem tocar o banco** — e devolve um `AuthenticatedDoctor(usuario_id, sessao_id, role)`. Token ausente, expirado ou adulterado resulta em HTTP 401; papel fora de `{doctor, admin}` resulta em HTTP 403. Há ainda `get_current_admin`, que encadeia `get_current_doctor` e exige o papel `admin`, sendo a barreira real dos endpoints administrativos (a ocultação de menus no front é apenas conveniência de interface).

# 5. Implementação do escore clínico

## 5.1 A regra vive no banco

A regra de escore não está em Python. O serviço de domínio `SymptomScoringOrchestrator` (`domain/services/`) é uma ponte fina para o banco: seu único método executa a função e tipa o retorno.

```python
class SymptomScoringOrchestrator:
    async def execute_scoring(self, avaliacao_id, session) -> ScoringResult:
        result = await session.execute(
            text("SELECT * FROM fn_calcular_score_triagem(:avaliacao_id)"),
            {"avaliacao_id": avaliacao_id})
        row = result.mappings().first()
        if row is None:
            raise ValueError(f"Falha ao calcular score para avaliação {avaliacao_id}")
        return ScoringResult(row["score_final"], row["limiar_usado"],
                             row["recomenda_exame"], row["versao_param"])
```

A função `fn_calcular_score_triagem(avaliacao_id)`, em uma única chamada atômica: lê as respostas do checklist; multiplica cada sintoma presente pelo peso correspondente ao sexo do paciente (`peso` para M, `peso_feminino` para F, da tabela `sintomas`); soma para obter o `score_final`; compara com o `limiar_score` vigente em `parametro_triagem`; grava a análise em `tb_log_analises`; e atualiza `tb_avaliacoes`, mudando o `status` para `finalizada`. Por isso o caso de uso **não** define o status manualmente.

## 5.2 Pesos, limiares e a decisão de recomendar

Os 12 sintomas têm pesos calibrados por sexo, e os limiares de decisão são específicos do sexo (M: 0.56; F: 0.55), com versões `ROMERO_2025_v1_M` e `ROMERO_2025_v1_F`. A decisão de `recomenda_exame` é calculada pela view `avaliacoes`:

```
recomenda_exame =
    NULL                          se score_final ainda e NULL
    false                         se diagnostico_previo_fxs = true
    score_final >= limiar(sexo)   caso contrario
```

Manter pesos e limiares no banco permite recalibrar o modelo com um simples `UPDATE`, sem novo deploy, e auditar cada execução (escore e versão do parâmetro ficam em `tb_log_analises`).

## 5.3 A orquestração da submissão

`SubmitAnamnesisUseCase` sequencia os passos do fluxo clínico, todos na mesma `AsyncSession`:

```python
# 1. cria a avaliacao em 'rascunho'
avaliacao_id = await self._avaliacoes.create_rascunho(...)
# 2. registra o acompanhante da visita (modelo por visita)
await self._avaliacoes.set_acompanhante(...)
# 3. abre o registro em tb_log_analises
await self._avaliacoes.open_log_analise(...)
# 4. persiste as respostas do checklist
await self._checklist.insert_respostas(...)
# 5. persiste o historico familiar (antes do score)
await self._historico.add(...)
# 6. calcula o score no banco
scoring_result = await self._scoring.execute_scoring(...)
# 7. encaminhamento automatico quando recomendado
if scoring_result.recomenda_exame:
    await self._encaminhamentos.add(tipo="exame_fmr1", gerado_automaticamente=True, ...)
# 8. auditoria (best-effort)
await self._audit.registrar(acao="AVALIACAO_FINALIZADA", ...)
```

A criticidade das etapas é diferenciada: histórico e encaminhamento são **fatais** (a falha desfaz a transação); a auditoria é **best-effort**, executada dentro de um SAVEPOINT (`begin_nested`) com tratamento de exceção que absorve a falha — a indisponibilidade da função de auditoria não interrompe o fluxo clínico. Se qualquer etapa lançar `RuntimeError`/`ValueError`, o router converte em HTTP 502.

# 6. Conformidade com a LGPD em cada camada

A LGPD é tratada como requisito transversal. As linhas de defesa estão distribuídas pela pilha.

## 6.1 Cifragem em repouso (banco)

Nomes cifrados com PGP simétrico; CPF apenas como hash; senha em bcrypt. Detalhado na seção 3.

## 6.2 Chave por sessão (banco/aplicação)

A chave PGP injetada por conexão (seção 3.3) garante que os dados sensíveis só sejam legíveis durante uma sessão autenticada com a chave correta.

## 6.3 Mascaramento na borda (apresentação)

`presentation/api/v1/masking.py` define `CPF_MASK = "***.***.***-**"` e `mask_name`. A API nunca devolve CPF em claro (de fato, só possui o hash) — onde o CPF apareceria, retorna-se o marcador. Quanto ao nome: o utilitário `mask_name` existe para exibir o primeiro nome e mascarar os sobrenomes, mas, no estado atual do código, **ele não é invocado nas respostas** — o nome do paciente é entregue decifrado ao médico dono (na listagem, no detalhe e na resposta de cadastro), enquanto o CPF é o dado efetivamente mascarado. Este documento descreve o comportamento real do código, e não apenas a intenção de projeto.

## 6.4 k-anonimato nas estatísticas (aplicação)

`GetDashboardStatsUseCase` aplica k-anonimato no nível de aplicação. Se qualquer grupo agregado retornado tiver menos de 5 avaliações, a resposta inteira é suprimida:

```python
K_ANONYMITY_THRESHOLD = 5
for row in rows:
    if row.total_avaliacoes < K_ANONYMITY_THRESHOLD:
        raise LGPDComplianceError(
            "... grupo com menos de 5 avaliações ... resposta suprimida (LGPD Art. 12).")
```

A fonte (`vw_dashboard_anonimizado`) já não contém dado pessoal — só agregações por sintoma, sexo, idade, etnia e UF. O guarda é uma defesa em profundidade adicional contra reidentificação.

## 6.5 RBAC e mitigação de IDOR (aplicação e banco)

No nível de aplicação, toda consulta é escopada ao médico dono (`WHERE criado_por = :usuario_id`), defesa contra IDOR já que os identificadores são sequenciais. No nível de banco, três papéis (`nivel_1` para a aplicação, que só enxerga as views; `nivel_2` para auditoria; `nivel_3` para BI) com Row Level Security efetivam o princípio do menor privilégio.

## 6.6 Auditabilidade (banco)

Quatro tabelas append-only sustentam a prestação de contas: `tb_log_sessoes`, `tb_log_tentativas_login`, `tb_log_analises` e `tb_auditoria` (esta com estado anterior e novo em JSONB). UPDATE e DELETE são revogados nessas tabelas, garantindo imutabilidade.

# 7. Modelo de comunicação do front-end

## 7.1 Sem empacotador

O front-end não tem etapa de build. O `index.html` carrega, por CDN, React 18.3 (UMD), Babel Standalone (que transpila os arquivos `.jsx` marcados como `type="text/babel"` no navegador), Tailwind CSS, jsPDF e as fontes Geist. Os módulos da aplicação são incluídos como `<script>` na ordem correta. Como não há sistema de módulos, os componentes e utilitários compartilham o **escopo global** (por exemplo, `api`, `Icon`, `FotoStore`, `window.gerarLaudoPDF`), e a ordem de inclusão define a disponibilidade.

## 7.2 O cliente de API único

Toda a rede passa por `frontend/src/api/client.js` — nenhum componente chama `fetch()` diretamente. O objeto `api`:

- Guarda o JWT em memória e em `sessionStorage`; o tema fica em `localStorage`.
- Possui o auxiliar central `_request()`, que injeta `Authorization: Bearer <token>`, serializa JSON e trata respostas. **Em HTTP 401, limpa a sessão e dispara `onUnauthorized`** (registrado pelo *app shell* para retornar à tela de login). Em erro, lança uma exceção com `status` e `detail`.
- Implementa o login no fluxo OAuth2 *password* (`application/x-www-form-urlencoded`).
- Expõe métodos de domínio nomeados para cada recurso (pacientes, avaliações, sintomas, acompanhantes, dashboard, relatórios, agendamentos e usuários).

```javascript
const API_BASE = (window.CITO_API_BASE || '/api/v1');
async _request(method, path, body) {
  const headers = {};
  const token = this.getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  ...
  if (res.status === 401) { this.clearSession(); this.onUnauthorized?.(); }
  ...
}
```

A base padrão `'/api/v1'` (mesma origem) é o que permite implantar front e back juntos no Azure. Para apontar a outro host em desenvolvimento, define-se `window.CITO_API_BASE` antes do carregamento do cliente.

## 7.3 Prévia de escore e laudo no cliente

A tela de Triagem calcula um escore de prévia localmente (mesmos pesos e limiares) apenas para antecipar o resultado ao médico; o valor oficial é sempre o do back-end. O laudo de triagem é gerado **no cliente**, em JavaScript puro, por `window.gerarLaudoPDF` (jsPDF), em `frontend/src/lib/laudo.js`. O módulo é compartilhado entre a Triagem (gera o laudo ao finalizar) e a tela de Pacientes (reimprime o laudo de uma avaliação já registrada, consumindo `GET /avaliacoes/{id}`).

## 7.4 Gestão de foto do paciente

A foto é tratada por `frontend/src/lib/foto-store.js` em conjunto com o back-end: o front envia a imagem em base64 para `POST /pacientes/{id}/foto`, e o back-end a grava no sistema de arquivos em `frontend/assets/uploads/paciente_{id}.jpg`. A URL de leitura é determinística (`/assets/uploads/paciente_{id}.jpg`), e a existência é verificada pelo `onError` da imagem.

# 8. Padrões de implementação no acesso a dados

## 8.1 Repositórios e segurança de consulta

Cada repositório recebe a `AsyncSession` no construtor e usa `sqlalchemy.text()` com **parâmetros nomeados** — nunca interpolação de string com dado do usuário, o que previne injeção de SQL. As cláusulas `WHERE` dinâmicas montam apenas fragmentos fixos de coluna mais *placeholders*. Inserts usam `RETURNING id`.

## 8.2 CQRS-lite

Há separação entre caminho de escrita e de leitura. Para pacientes, por exemplo, `PatientRepository` (escrita e *lookup*, devolve a entidade `Patient`) coexiste com `PatientReadRepository` (leitura de listas e detalhe, devolve *dataclasses* achatadas otimizadas para a tela, com JOIN LATERAL para a última avaliação). O caminho de leitura monta *read models* sob medida para a interface, evitando carregar a entidade inteira só para exibir uma tabela.

## 8.3 Auditoria que nunca derruba o fluxo

O `AuditRepository` registra em `fn_registrar_auditoria` dentro de um SAVEPOINT (`begin_nested`) com `try/except` que absorve a falha. Se a função de auditoria não existir ou falhar, o SAVEPOINT isola o erro e o fluxo clínico segue.

# 9. Detalhes de implantação relevantes ao código

Dois aspectos do `app/main.py` impactam diretamente a operação:

- **Servir o front-end estático.** Quando a pasta `frontend/` existe ao lado de `app/`, o FastAPI registra a rota raiz (devolve `index.html`) e um *catch-all* (devolve o arquivo solicitado ou o `index.html`). É o que permite implantar como serviço único no Azure, na mesma origem.
- **Sonda de saúde em modo de diagnóstico.** O `GET /health` atual retorna, além do status, se a pasta `frontend` foi encontrada, o caminho calculado para ela e o conteúdo do diretório raiz — útil para depurar o empacotamento da publicação. É um detalhe a considerar antes de expor a sonda publicamente.

A criação de usuário (`UserRepository.create_medico`) cifra a senha com bcrypt na própria instrução de INSERT (`crypt(:senha, gen_salt('bf'))`), e o login verifica com `crypt(:senha, senha)`. O comentário no código observa que o banco implantado faz o *hashing* na inserção, sem depender de um gatilho de hash — a camada Python nunca manipula bcrypt diretamente.

# 10. Rede de segurança estática

O projeto mantém duas verificações que rodam **sem banco**, formando sua rede de segurança:

- `python -c "import app.main"` — importa tudo e cria o app, validando *wiring* de rotas, schemas e imports (o asyncpg conecta de forma preguiçosa).
- `python scripts/check_contract.py` — guarda de contrato front-back: confere que todo endpoint consumido pelo front existe no app, com o método correto, e que payloads representativos validam contra os schemas (com `extra="forbid"`, um campo renomeado ou sobrando é detectado).

Essas verificações, somadas ao uso pervasivo de `extra="forbid"` nos schemas Pydantic, detectam divergências de contrato antes do teste ponta a ponta.

# 11. Notas sobre o estado real versus a documentação de origem

Por fidelidade ao código, registram-se aqui pontos em que a implementação atual evoluiu além da documentação de arquitetura original:

- O back-end registra **nove routers** (foi acrescentado o router `users`, de gestão de médicos); a documentação de origem mencionava oito.
- O conjunto de endpoints de pacientes inclui **arquivamento** (`PATCH`), **exclusão definitiva com confirmação por senha** (`DELETE`, em cascata) e **gestão de foto**.
- O `app/main.py` passou a **servir o front-end estático** e a sonda `/health` está em modo de diagnóstico.
- O **mascaramento de nome** (`mask_name`) está disponível, mas não é efetivamente aplicado nas respostas no estado atual — o dado mascarado na borda é o CPF.

Esses pontos não contradizem os princípios de arquitetura (hexagonal, acesso só por views, LGPD transversal, escore no banco); refletem a evolução natural do código e estão documentados aqui para evitar surpresas a quem se apoiar apenas na documentação anterior.

# 12. Conclusão

A implementação do CITO concentra suas decisões mais sensíveis em pontos bem delimitados e auditáveis: a criptografia e o escore residem no banco, a autenticação e a tradução de erros vivem no `core`, o mascaramento e o contrato HTTP ficam na apresentação, e toda a rede do front passa por um único cliente de API. A LGPD não é um módulo, e sim uma propriedade distribuída por todas as camadas — da cifragem em repouso à supressão estatística por k-anonimato. Um desenvolvedor que internalize quatro ideias — o escore mora no banco, a chave PGP é por sessão, o acesso é só pelas views e tudo é escopado pelo médico dono — terá a base conceitual para navegar e estender o código com segurança.
