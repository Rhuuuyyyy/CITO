# Plano de Integração — CITO (Revisão 2.0)

**Data:** 2026-06-08  
**Autor:** Análise arquitetural automatizada  
**Status:** Aguardando execução

---

## Contexto do Projeto

O sistema CITO é uma ferramenta de pré-diagnóstico da Síndrome do X Frágil (SXF) para médicos. Foi desenvolvido por três grupos separados com baixa sincronização:

- **Frontend:** React/JSX, localizado em `frontend/src/`
- **Backend:** FastAPI (Python), arquitetura hexagonal, em `app/`
- **Banco de Dados:** PostgreSQL no Supabase, documentado em `docs/database_report.md`

**Problema central:** O frontend nunca se comunicou com o backend. Toda comunicação de dados vai diretamente ao Supabase via cliente JavaScript (`supabaseClient.js`). O backend FastAPI existe mas nunca é chamado por ninguém.

**Objetivo:** Fazer o frontend se comunicar exclusivamente com o backend FastAPI, que por sua vez acessa o banco via suas views e repositórios já implementados.

---

## Arquitetura Atual (Estado Quebrado)

```
Frontend (React) ──────────────────────→ Supabase (PostgREST direto)
        │                                       │
        │   ← ZERO comunicação →                │  tb_pacientes, tb_avaliacoes,
        │                                       │  fn_login, fn_calcular_score...
Backend (FastAPI) ─────────────────────→ ???
(nunca chamado por ninguém)
```

## Arquitetura Alvo

```
Frontend (React) ──→ FastAPI Backend (/api/v1/*) ──→ PostgreSQL (Supabase)
  fetch() + JWT       Auth, CORS, Use Cases            Views: pacientes,
                      Repositórios já prontos           avaliacoes, acompanhantes
```

---

## Como o Banco de Dados Funciona (LEIA ANTES DE EXECUTAR)

O banco tem **três camadas** (detalhes em `docs/database_report.md`):

1. **Tabelas físicas** (`tb_*`): armazenam dados cifrados (BYTEA) — nunca acessadas diretamente
2. **Views lógicas** (`pacientes`, `avaliacoes`, `acompanhantes`): interface do backend — triggers `INSTEAD OF` aplicam `pgp_sym_encrypt` na escrita e `pgp_sym_decrypt` na leitura automaticamente
3. **View de relatório** (`vw_dashboard_anonimizado`): agregados anônimos para BI

**Criptografia de nomes:**
- Algoritmo: `pgp_sym_encrypt` / `pgp_sym_decrypt` (AES-256, extensão `pgcrypto`)
- A chave PGP nunca fica no banco — é injetada por conexão via `SET app.pgp_key = '...'`
- O backend já faz isso em `app/db/database.py` → `get_db_session()` → `set_config('app.pgp_key', :key, true)`
- O frontend usava `encodeNome()`/`decodeNome()` (hex UTF-8 simples) — **NÃO é PGP**, é incompatível, deve ser removido

**CPF:** SHA-256 (one-way), armazenado em `cpf_hash`  
**Senhas:** bcrypt via trigger `fn_hash_senha_usuario` na tabela `usuarios`

---

## Inventário de Lacunas

### Lacunas já resolvidas pela arquitetura existente

| ID | Descrição | Por quê está resolvido |
|---|---|---|
| GAP-02 | Nomes de tabelas divergentes (`tb_*` vs sem prefixo) | Backend usa as views corretas (`pacientes`, `avaliacoes`, `acompanhantes`) — as views são a camada lógica projetada para isso |
| GAP-04 | Estratégia de criptografia de nomes incompatível | Backend já injeta `pgp_key` via `set_config` — views descriptografam transparentemente |
| GAP-05 | Campos geográficos obrigatórios ausentes no form | `uf_nascimento`, `municipio_residencia`, `uf_residencia` são nullable no banco |

### Lacunas que precisam de implementação

| ID | Gravidade | Componente | Descrição |
|---|---|---|---|
| GAP-01 | 🔴 Crítico | Frontend | Zero chamadas HTTP ao backend; tudo via Supabase JS |
| GAP-03 | 🔴 Crítico | Auth | Frontend usa `db.rpc('fn_login')`, backend usa OAuth2 + JWT |
| GAP-13 | 🔴 Crítico | Backend | `DashboardRepository.get_stats()` consulta colunas inexistentes em `vw_dashboard_anonimizado` |
| GAP-06 | 🟠 Alto | Backend | Histórico familiar (`tb_historico_familiar`) sem implementação no backend |
| GAP-07 | 🟠 Alto | Backend | Login response não retorna `usuario_id` (frontend precisa dele) |
| GAP-09 | 🟡 Médio | Backend | `PatientListItemSchema` incompleto — faltam score, acompanhante, cpf_masked |
| GAP-10 | 🟡 Médio | Backend | `SubmitAnamnesisRequest` sem campo `historico_familiar` |
| GAP-14 | 🟡 Médio | Backend/BD | `AvaliacaoReadRepository` consulta `recomenda_exame` — confirmar se existe na view `avaliacoes` |
| GAP-15 | 🟡 Médio | Dados | Dados existentes gravados pelo frontend estão em hex UTF-8, não PGP |
| GAP-11 | 🔵 Baixo | Backend | Typo `app_verison` em `config.py:21` causa `AttributeError` no startup |
| GAP-12 | 🔵 Baixo | Backend | `AcompanhanteCreateRequest` sem campo `relacao` |

---

## Decisões Pendentes (Requerem Resposta Humana Antes de Executar)

### Decisão 1 — GAP-14: coluna `recomenda_exame` na view `avaliacoes`

O backend consulta `a.recomenda_exame` em vários repositórios (`AvaliacaoReadRepository`, `DashboardRepository`). A tabela física `tb_avaliacoes` não tem essa coluna.

**Verificar no Supabase:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'avaliacoes' AND table_schema = 'public';
```

- Se existir → nenhuma ação necessária.
- Se não existir → o grupo de banco deve adicionar à view como coluna computada:
  ```sql
  CASE WHEN a.score_final >= pt.limiar_score THEN TRUE ELSE FALSE END AS recomenda_exame
  ```

### Decisão 2 — GAP-15: dados de nomes já existentes no banco

O frontend gravou nomes como hex UTF-8 (`\x...`). As views esperam PGP. Os dados existentes são incompatíveis.

**Opção A (recomendada para projeto acadêmico):** Apagar os registros de teste e começar do zero com dados gravados pelo backend.

**Opção B:** Escrever script de migração que decodifica hex UTF-8 e re-cifra com PGP.

### Decisão 3 — PGP_KEY

O valor da `PGP_KEY` deve ser o mesmo usado nas views do banco para `pgp_sym_encrypt`. Obter com o grupo de banco de dados.

---

## Fase 1 — Banco de Dados

**Responsável:** Grupo de Banco de Dados  
**Pré-requisito para:** Fase 2

### 1.1 — Confirmar coluna `recomenda_exame` na view `avaliacoes` (Decisão 1 acima)

### 1.2 — Resolver dados existentes em hex UTF-8 (Decisão 2 acima)

### 1.3 — Confirmar assinatura de `fn_calcular_score_triagem`

Executar e verificar que retorna exatamente estas colunas:
```sql
SELECT * FROM fn_calcular_score_triagem(1) LIMIT 0;
-- Deve retornar: score_final, limiar_usado, recomenda_exame, versao_param
```

---

## Fase 2 — Correção e Extensão do Backend

**Responsável:** Grupo de Backend  
**Arquivos a modificar:** listados abaixo com localização exata

### 2.1 — Corrigir typo fatal em `config.py` (GAP-11)

**Arquivo:** `app/core/config.py`, linha 21

```python
# ANTES (causa AttributeError no startup — main.py:43 acessa app_version):
app_verison: str = "0.1.0"

# DEPOIS:
app_version: str = "0.1.0"
```

### 2.2 — Adicionar `usuario_id` à resposta de login (GAP-07)

**Arquivo:** `app/presentation/api/v1/schemas/auth.py`

```python
class TokenLoginResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    access_token: str
    token_type: str = "Bearer"
    sessao_id: int
    usuario_id: int  # NOVO
```

**Arquivo:** `app/presentation/api/v1/routers/auth.py`

No `return TokenLoginResponse(...)` da função `login`, adicionar `usuario_id=usuario_id`.

### 2.3 — Adicionar histórico familiar ao pipeline de anamnese (GAP-06 + GAP-10)

#### 2.3.1 — DTO (`app/application/dtos/anamnesis.py`)

Adicionar ao arquivo existente:

```python
@dataclass(frozen=True)
class HistoricoFamiliarDTO:
    deficiencia_intelectual: bool = False
    falencia_ovariana_precoce: bool = False
    autismo_na_familia: bool = False
    epilepsia: bool = False
    infertilidade_masculina: bool = False
    menopausa_precoce: bool = False
    abortos_recorrentes: bool = False
    tremor_ataxia_familiar: bool = False
    descricao_outros: str | None = None
```

Adicionar campo ao `SubmitAnamnesisDTO` existente:
```python
historico_familiar: HistoricoFamiliarDTO | None = None
```

#### 2.3.2 — Repositório (arquivo novo: `app/interfaces/repositories/historico_familiar_repository.py`)

```python
from __future__ import annotations
from dataclasses import asdict
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.application.dtos.anamnesis import HistoricoFamiliarDTO


class HistoricoFamiliarRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def insert(self, *, avaliacao_id: int, historico: HistoricoFamiliarDTO) -> None:
        await self._session.execute(
            text("""
                INSERT INTO tb_historico_familiar (
                    avaliacao_id, deficiencia_intelectual, falencia_ovariana_precoce,
                    autismo_na_familia, epilepsia, infertilidade_masculina,
                    menopausa_precoce, abortos_recorrentes, tremor_ataxia_familiar,
                    descricao_outros
                ) VALUES (
                    :avaliacao_id, :deficiencia_intelectual, :falencia_ovariana_precoce,
                    :autismo_na_familia, :epilepsia, :infertilidade_masculina,
                    :menopausa_precoce, :abortos_recorrentes, :tremor_ataxia_familiar,
                    :descricao_outros
                )
            """),
            {"avaliacao_id": avaliacao_id, **asdict(historico)},
        )
```

#### 2.3.3 — Use Case (`app/application/use_cases/submit_anamnesis.py`)

Adicionar `HistoricoFamiliarRepository` ao `__init__`:
```python
def __init__(
    self,
    avaliacoes: AvaliacaoRepository,
    checklist: ChecklistRepository,
    scoring: SymptomScoringOrchestrator,
    historico: HistoricoFamiliarRepository,  # NOVO
) -> None:
    self._avaliacoes = avaliacoes
    self._checklist = checklist
    self._scoring = scoring
    self._historico = historico  # NOVO
```

Adicionar após o passo 3 (inserção de respostas), antes do scoring:
```python
# Step 3.5 — Persist family history (optional)
if request.historico_familiar is not None:
    await self._historico.insert(
        avaliacao_id=avaliacao_id,
        historico=request.historico_familiar,
    )
```

#### 2.3.4 — Schema HTTP (`app/presentation/api/v1/schemas/anamnesis.py`)

Adicionar ao arquivo:
```python
class HistoricoFamiliarSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    deficiencia_intelectual: bool = False
    falencia_ovariana_precoce: bool = False
    autismo_na_familia: bool = False
    epilepsia: bool = False
    infertilidade_masculina: bool = False
    menopausa_precoce: bool = False
    abortos_recorrentes: bool = False
    tremor_ataxia_familiar: bool = False
    descricao_outros: str | None = Field(default=None, max_length=1000)
```

Adicionar campo ao `SubmitAnamnesisRequest`:
```python
historico_familiar: HistoricoFamiliarSchema | None = None
```

#### 2.3.5 — Router (`app/presentation/api/v1/routers/anamnesis.py`)

Em `_build_use_case()`, adicionar `HistoricoFamiliarRepository`:
```python
from app.interfaces.repositories.historico_familiar_repository import HistoricoFamiliarRepository

def _build_use_case(session: AsyncSession) -> SubmitAnamnesisUseCase:
    return SubmitAnamnesisUseCase(
        avaliacoes=AvaliacaoRepository(session),
        checklist=ChecklistRepository(session),
        scoring=SymptomScoringOrchestrator(),
        historico=HistoricoFamiliarRepository(session),  # NOVO
    )
```

Em `_to_dto()`, mapear o campo:
```python
def _to_dto(payload: SubmitAnamnesisRequest) -> SubmitAnamnesisDTO:
    from app.application.dtos.anamnesis import HistoricoFamiliarDTO
    hf = payload.historico_familiar
    return SubmitAnamnesisDTO(
        paciente_id=payload.paciente_id,
        sessao_id=payload.sessao_id,
        observacoes=payload.observacoes,
        diagnostico_previo_fxs=payload.diagnostico_previo_fxs,
        respostas=[
            ChecklistItemDTO(sintoma_id=r.sintoma_id, presente=r.presente, observacao=r.observacao)
            for r in payload.respostas
        ],
        historico_familiar=HistoricoFamiliarDTO(
            deficiencia_intelectual=hf.deficiencia_intelectual,
            falencia_ovariana_precoce=hf.falencia_ovariana_precoce,
            autismo_na_familia=hf.autismo_na_familia,
            epilepsia=hf.epilepsia,
            infertilidade_masculina=hf.infertilidade_masculina,
            menopausa_precoce=hf.menopausa_precoce,
            abortos_recorrentes=hf.abortos_recorrentes,
            tremor_ataxia_familiar=hf.tremor_ataxia_familiar,
            descricao_outros=hf.descricao_outros,
        ) if hf is not None else None,
    )
```

### 2.4 — Corrigir `DashboardRepository.get_stats()` (GAP-13)

**Arquivo:** `app/interfaces/repositories/dashboard_repository.py`

A view `vw_dashboard_anonimizado` tem colunas diferentes do que o backend consulta.

**Colunas reais da view:** `sintoma`, `sexo`, `idade_anos`, `etnia`, `uf_residencia`, `total_avaliacoes`, `total_presentes`, `prevalencia_pct`, `versao_parametro`

Reescrever o método `get_stats()` e o dataclass `DashboardRow`:

```python
@dataclass(frozen=True)
class DashboardRow:
    uf_residencia: str | None
    sexo: str | None
    sintoma: str | None
    etnia: str | None
    idade_anos: int | None
    total_avaliacoes: int
    total_presentes: int | None
    prevalencia_pct: float | None
    versao_parametro: str | None

async def get_stats(
    self,
    *,
    uf: str | None = None,
    sexo: str | None = None,
    etnia: str | None = None,
) -> list[DashboardRow]:
    conditions = []
    params: dict[str, str] = {}
    if uf:
        conditions.append("uf_residencia = :uf")
        params["uf"] = uf
    if sexo:
        conditions.append("sexo = :sexo")
        params["sexo"] = sexo
    if etnia:
        conditions.append("etnia = :etnia")
        params["etnia"] = etnia

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    result = await self._session.execute(
        text(f"""
            SELECT uf_residencia, sexo, sintoma, etnia, idade_anos,
                   total_avaliacoes, total_presentes, prevalencia_pct, versao_parametro
            FROM   vw_dashboard_anonimizado
            {where_clause}
            ORDER  BY total_avaliacoes DESC
        """),
        params,
    )
    rows = result.mappings().all()
    return [
        DashboardRow(
            uf_residencia=cast("str | None", r["uf_residencia"]),
            sexo=cast("str | None", r["sexo"]),
            sintoma=cast("str | None", r["sintoma"]),
            etnia=cast("str | None", r["etnia"]),
            idade_anos=cast("int | None", r["idade_anos"]),
            total_avaliacoes=cast(int, r["total_avaliacoes"]),
            total_presentes=cast("int | None", r["total_presentes"]),
            prevalencia_pct=cast("float | None", r["prevalencia_pct"]),
            versao_parametro=cast("str | None", r["versao_parametro"]),
        )
        for r in rows
    ]
```

Atualizar também `DashboardRowSchema` em `app/presentation/api/v1/schemas/history.py` para refletir os novos campos.

### 2.5 — Corrigir `get_summary()` se `recomenda_exame` não existir na view (GAP-14)

**Arquivo:** `app/interfaces/repositories/dashboard_repository.py`

Se após a verificação da Decisão 1 a coluna não existir na view, substituir no método `get_summary()`:

```sql
-- ANTES (pode falhar):
COUNT(*) FILTER (WHERE a.recomenda_exame = TRUE)

-- DEPOIS (calcula a partir do score e do limiar):
COUNT(*) FILTER (
    WHERE a.score_final IS NOT NULL
      AND a.score_final >= (
          SELECT pt.limiar_score FROM parametro_triagem pt
          JOIN pacientes px ON px.id = a.paciente_id
          WHERE pt.sexo = px.sexo AND pt.ativo = TRUE
          LIMIT 1
      )
)
```

### 2.6 — Enriquecer listagem de pacientes (GAP-09)

**Arquivo:** `app/presentation/api/v1/schemas/patient.py`

```python
class PatientListItemSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    nome: str
    sexo: str | None = None
    data_nascimento: str | None = None
    cpf_masked: str | None = None          # NOVO
    telefone_acompanhante: str | None = None  # NOVO
    ultimo_score: float | None = None      # NOVO
    ultima_avaliacao_data: str | None = None  # NOVO
    status_risco: str | None = None        # NOVO: "encaminhar" | "baixo" | None
```

**Arquivo:** `app/interfaces/repositories/patient_read_repository.py`

Substituir a query em `list_by_doctor()`:

```sql
SELECT
    p.id,
    p.nome,
    p.sexo,
    TO_CHAR(p.data_nascimento, 'YYYY-MM-DD') AS data_nascimento,
    CASE WHEN p.cpf_hash IS NOT NULL THEN '***.***.***-**' END AS cpf_masked,
    ac.telefone AS telefone_acompanhante,
    ult.score_final AS ultimo_score,
    TO_CHAR(ult.data_avaliacao, 'YYYY-MM-DD') AS ultima_avaliacao_data
FROM   pacientes p
LEFT   JOIN acompanhantes ac ON ac.id = p.acompanhante_id
LEFT   JOIN LATERAL (
    SELECT score_final, data_avaliacao
    FROM   avaliacoes
    WHERE  paciente_id = p.id AND status = 'finalizada'
    ORDER  BY data_avaliacao DESC LIMIT 1
) ult ON TRUE
WHERE  p.criado_por = :usuario_id
```

Atualizar também o dataclass `PatientListItem` e o `count_by_doctor()` conforme necessário.

### 2.7 — Adicionar `relacao` ao schema do acompanhante (GAP-12)

**Arquivo:** `app/presentation/api/v1/schemas/patient.py`

```python
class AcompanhanteCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    nome: str = Field(min_length=2, max_length=120)
    cpf: str | None = Field(default=None, min_length=11, max_length=14)
    telefone: str = Field(min_length=8, max_length=20)
    email: str = Field(max_length=254)
    relacao: str | None = None  # NOVO: "Mãe", "Pai", "Cuidador(a)", etc.
```

**Arquivo:** `app/application/use_cases/register_patient.py`

No `RegisterPatientUseCase.execute()`, ao construir o `Patient`, passar `grau_parentesco=request.acompanhante.relacao` se disponível.

---

## Fase 3 — Migração do Frontend para API REST

**Responsável:** Grupo de Frontend  
**Pré-requisito:** Fase 2 concluída

### 3.1 — Criar módulo de API (`frontend/src/api/client.js`)

Criar o arquivo:

```javascript
const API_BASE = 'http://localhost:8000/api/v1';

function getHeaders() {
  const token = sessionStorage.getItem('cito_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

export async function apiLogin(email, senha) {
  const body = new URLSearchParams({ username: email, password: senha });
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw await res.json();
  const data = await res.json();
  sessionStorage.setItem('cito_token', data.access_token);
  return data; // { access_token, token_type, sessao_id, usuario_id }
}

export async function apiLogout(sessaoId) {
  await fetch(`${API_BASE}/auth/logout?sessao_id=${sessaoId}`, {
    method: 'POST',
    headers: getHeaders(),
  });
  sessionStorage.removeItem('cito_token');
}

export async function apiGet(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}
```

### 3.2 — Migrar autenticação (`frontend/src/pages/Login.jsx`)

**Remover:** `db.rpc('fn_login', { p_email, p_senha, p_user_agent })`

**Substituir `handleSubmit` por:**

```javascript
import { apiLogin } from '../api/client.js';

async function handleSubmit(e) {
  e.preventDefault();
  setErro('');
  if (!email.trim() || !senha) {
    setErro('Preencha e-mail e senha para continuar.');
    return;
  }
  setLoading(true);
  try {
    const data = await apiLogin(email.trim().toLowerCase(), senha);
    onLogin({ id: data.usuario_id, sessao_id: data.sessao_id });
  } catch (err) {
    setErro('Credenciais inválidas. Verifique e tente novamente.');
  } finally {
    setLoading(false);
  }
}
```

### 3.3 — Migrar cadastro de paciente (`frontend/src/pages/Pacientes.jsx`)

**Remover:** `db.from('tb_acompanhantes').insert(...)`, `db.from('tb_pacientes').insert(...)`, `encodeNome()`, `hashCpf()`, `db.rpc('fn_registrar_auditoria', ...)`

**Substituir `handleSalvar` por:**

```javascript
import { apiPost, apiGet } from '../api/client.js';

async function handleSalvar({ paciente: p, acompanhantes }) {
  const a = acompanhantes[0];
  try {
    await apiPost('/pacientes', {
      nome:                    p.nome,
      cpf:                     p.cpf?.replace(/\D/g, '') || null,
      data_nascimento:         p.dataNasc,
      sexo:                    p.sexo,
      etnia:                   p.etnia || 'nao_declarado',
      escolaridade:            p.escolaridade || null,
      prematuro:               p.prematuro,
      tem_diagnostico_autismo: p.tem_diagnostico_autismo,
      tem_diagnostico_tdah:    p.tem_diagnostico_tdah,
      outras_comorbidades:     p.outras_comorbidades || null,
      medicamentos_uso:        p.medicamentos_uso || null,
      acompanhante: {
        nome:     a.nome,
        telefone: a.telefone || '',
        email:    a.email || '',
        relacao:  a.relacao || null,
      },
    });
    carregarPacientes();
  } catch (err) {
    console.error('Erro ao salvar paciente:', err);
  }
}
```

**Substituir `carregarPacientes` por:**

```javascript
async function carregarPacientes() {
  setLoading(true);
  try {
    const data = await apiGet('/pacientes', { limit: 200 });
    setPacientes(data.items.map(p => ({
      id:      p.id,
      nome:    p.nome,
      sexo:    p.sexo,
      nasc:    p.data_nascimento
               ? p.data_nascimento.split('-').reverse().join('/') : '—',
      cpf:     p.cpf_masked || '—',
      cel:     p.telefone_acompanhante || '—',
      ult:     p.ultima_avaliacao_data
               ? p.ultima_avaliacao_data.split('-').reverse().join('/') : '—',
      risco:   p.status_risco || 'baixo',
      score:   p.ultimo_score || 0,
    })));
  } finally {
    setLoading(false);
  }
}
```

**Substituir `ModalProntuario` (leitura de avaliações) por:**

```javascript
import { apiGet } from '../api/client.js';

useEffect(() => {
  apiGet(`/pacientes/${paciente.id}/historico`)
    .then(data => { setAvaliacoes(data.items); setLoading(false); })
    .catch(err => { console.error(err); setLoading(false); });
}, [paciente.id]);
```

### 3.4 — Migrar triagem (`frontend/src/pages/Triagem.jsx`)

**Remover:** todos os `db.from(...).insert(...)`, `db.rpc('fn_calcular_score_triagem', ...)`, `db.rpc('fn_registrar_auditoria', ...)`, `encodeNome()`, `hashCpf()`

**Substituir o `useEffect` inicial (busca de pacientes e sintomas) por:**

```javascript
import { apiGet } from '../api/client.js';

useEffect(() => {
  // Buscar lista de sintomas (IDs) do banco
  apiGet('/sintomas').then(data => {   // endpoint a criar — veja nota abaixo
    const map = {};
    data.forEach(s => {
      const key = Object.keys(SINTOMA_DESCRICAO).find(k => SINTOMA_DESCRICAO[k] === s.descricao);
      if (key) map[key] = s.id;
    });
    setSintomaIdMap(map);
  });

  // Buscar lista de pacientes
  apiGet('/pacientes', { limit: 500 }).then(data => setPacientesDb(data.items));
}, []);
```

> **Nota:** É necessário criar um endpoint `GET /api/v1/sintomas` no backend que retorne `[{id, descricao}]` da tabela `sintomas`. Adicionar router em `app/presentation/api/v1/routers/` e registrar em `main.py`.

**Substituir `salvarTriagem` por:**

```javascript
async function salvarTriagem() {
  if (!usuario?.id) return false;
  setSalvando(true);
  try {
    const respostasArr = sintomasFiltrados
      .map(s => ({
        sintoma_id: sintomaIdMap[s.id],
        presente:   respostas[s.id] === 1,
        observacao: '',
      }))
      .filter(r => r.sintoma_id != null);

    await apiPost('/avaliacoes', {
      paciente_id:            pacienteId,
      sessao_id:              usuario.sessao_id,
      observacoes:            '',
      diagnostico_previo_fxs: false,
      respostas:              respostasArr,
      historico_familiar: {
        deficiencia_intelectual:   !!historico.deficiencia_intelectual,
        autismo_na_familia:        !!historico.autismo_na_familia,
        epilepsia:                 !!historico.epilepsia,
        falencia_ovariana_precoce: !!historico.falencia_ovariana_precoce,
        menopausa_precoce:         !!historico.menopausa_precoce,
        infertilidade_masculina:   !!historico.infertilidade_masculina,
        abortos_recorrentes:       !!historico.abortos_recorrentes,
        tremor_ataxia_familiar:    !!historico.tremor_ataxia_familiar,
        descricao_outros:          historico.descricao_outros?.trim() || null,
      },
    });
    return true;
  } catch (err) {
    console.error('Erro ao salvar triagem:', err);
    return false;
  } finally {
    setSalvando(false);
  }
}
```

### 3.5 — Migrar dashboard (`frontend/src/pages/Dashboard.jsx`)

**Remover:** queries diretas `db.from('tb_avaliacoes').select(...)` e `db.from('tb_pacientes').select(...)`

**Substituir o `useEffect` de carregamento por:**

```javascript
import { apiGet } from '../api/client.js';

useEffect(() => {
  async function carregar() {
    const data = await apiGet('/dashboard/summary');
    setStats([
      {
        label: 'Triagens hoje',
        value: String(data.avaliacoes_hoje),
        sub: 'Sessões clínicas',
        detail: [
          { label: 'Esta semana', val: String(data.avaliacoes_semana) },
          { label: 'Total pacientes', val: String(data.total_pacientes) },
        ],
      },
      {
        label: 'Taxa de encaminhamento',
        value: data.taxa_recomendacao_exame != null
          ? `${(data.taxa_recomendacao_exame * 100).toFixed(0)}%` : '—',
        sub: 'Das triagens finalizadas',
        detail: [
          { label: 'Limiar ♂', val: '≥ 0.56' },
          { label: 'Limiar ♀', val: '≥ 0.55' },
        ],
      },
      {
        label: 'Pacientes ativos',
        value: String(data.total_pacientes),
        sub: 'Em prontuário',
        detail: [{ label: 'Triagens esta semana', val: String(data.avaliacoes_semana) }],
      },
    ]);
  }
  carregar();
}, []);
```

### 3.6 — Endpoint extra necessário: `GET /api/v1/sintomas`

O frontend precisa mapear sintomas por descrição para obter seus IDs. Criar em `app/presentation/api/v1/routers/sintomas.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.database import get_db_session
from app.interfaces.api.dependencies import get_current_doctor, AuthenticatedDoctor

router = APIRouter(prefix="/sintomas", tags=["Sintomas"])

@router.get("")
async def list_sintomas(
    doctor: AuthenticatedDoctor = Depends(get_current_doctor),
    session: AsyncSession = Depends(get_db_session),
):
    result = await session.execute(
        text("SELECT id, descricao, peso, peso_feminino, exclusivo_masculino FROM sintomas WHERE ativo = TRUE ORDER BY id")
    )
    return result.mappings().all()
```

Registrar em `app/main.py`: `from app.presentation.api.v1.routers import sintomas` e `app.include_router(sintomas.router, prefix=settings.api_prefix)`.

### 3.7 — Remover dependência do Supabase

Após concluir todas as migrações:

1. Remover `frontend/src/supabaseClient.js`
2. Remover `encodeNome`, `decodeNome`, `hashCpf` de todos os arquivos onde aparecem
3. Se o Supabase JS SDK estiver carregado via `<script>` em `index.html`, remover a tag

---

## Fase 4 — Configuração de Ambiente

### 4.1 — Criar `.env` do backend

Copiar `.env.example` para `.env` e preencher:

```bash
APP_NAME="CITO Backend"
APP_VERSION="0.1.0"
ENVIRONMENT=development
DEBUG=true
API_PREFIX=/api/v1

# Gerar com: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=<chave-aleatória-de-32-bytes-mínimo>

# Todas as origens do frontend em desenvolvimento
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:5500,http://127.0.0.1:3000

# Supabase → Settings → Database → Connection string → URI
# Trocar "postgresql://" por "postgresql+asyncpg://"
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>:5432/postgres

# Mesma chave PGP usada nas views do banco para pgp_sym_encrypt/decrypt
# Obter com o grupo de Banco de Dados
PGP_KEY=<chave-pgp>
```

### 4.2 — Iniciar o backend

```bash
cd /home/rhyan-rocha/Documentos/CITO
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verificar:
- `GET http://localhost:8000/health` → `{"status": "ok"}`
- `GET http://localhost:8000/api/v1/docs` → Swagger UI com todos os endpoints

---

## Fase 5 — Testes e Validação

### 5.1 — Testes de contrato via Swagger (`/api/v1/docs`)

| Endpoint | Método | Cenário | Resultado esperado |
|---|---|---|---|
| `/auth/login` | POST (form) | Credenciais válidas | `200` + `{access_token, sessao_id, usuario_id}` |
| `/auth/login` | POST | Senha errada | `401 Unauthorized` |
| `/auth/login` | POST | 5 falhas consecutivas do mesmo IP | `429 Too Many Requests` |
| `/pacientes` | POST | JWT válido + payload completo | `201` + `{id, db_id, nome_masked, sexo}` |
| `/pacientes` | GET | JWT válido | `200` + lista paginada com score e acompanhante |
| `/sintomas` | GET | JWT válido | `200` + lista de 12 sintomas com pesos |
| `/avaliacoes` | POST | JWT válido + 12 respostas + histórico | `201` + `{avaliacao_id, score_final, recomenda_exame}` |
| `/pacientes/{id}/historico` | GET | JWT válido | `200` + lista de avaliações do paciente |
| `/dashboard/summary` | GET | JWT válido | `200` + `{total_pacientes, avaliacoes_hoje, avaliacoes_semana, taxa_recomendacao_exame}` |
| Qualquer endpoint | — | Sem token | `401 Unauthorized` |

### 5.2 — Testes de fluxo E2E no browser

1. **Login** → credenciais válidas → redireciona para dashboard com stats carregados via API
2. **Novo paciente** → formulário → salvar → paciente aparece na lista com dados corretos
3. **Triagem completa** → 5 passos → submeter → score exibido → PDF gerado localmente
4. **Prontuário** → abrir histórico de avaliações de um paciente existente
5. **Logout** → sessão encerrada → redireciona para login

---

## Resumo de Arquivos a Modificar

### Backend
| Arquivo | Tipo de mudança |
|---|---|
| `app/core/config.py` | Fix typo `app_verison` → `app_version` |
| `app/presentation/api/v1/schemas/auth.py` | Adicionar `usuario_id` ao `TokenLoginResponse` |
| `app/presentation/api/v1/routers/auth.py` | Retornar `usuario_id` no login |
| `app/application/dtos/anamnesis.py` | Adicionar `HistoricoFamiliarDTO` e campo em `SubmitAnamnesisDTO` |
| `app/interfaces/repositories/historico_familiar_repository.py` | **CRIAR** |
| `app/application/use_cases/submit_anamnesis.py` | Injetar e chamar `HistoricoFamiliarRepository` |
| `app/presentation/api/v1/schemas/anamnesis.py` | Adicionar `HistoricoFamiliarSchema` e campo em `SubmitAnamnesisRequest` |
| `app/presentation/api/v1/routers/anamnesis.py` | Injetar repositório + mapear DTO |
| `app/interfaces/repositories/dashboard_repository.py` | Corrigir `get_stats()` (colunas reais da view) + fix `recomenda_exame` |
| `app/presentation/api/v1/schemas/history.py` | Atualizar `DashboardRowSchema` |
| `app/presentation/api/v1/schemas/patient.py` | Enriquecer `PatientListItemSchema` + adicionar `relacao` ao acompanhante |
| `app/interfaces/repositories/patient_read_repository.py` | Query enriquecida com JOINs |
| `app/presentation/api/v1/routers/sintomas.py` | **CRIAR** |
| `app/main.py` | Registrar router de sintomas |

### Frontend
| Arquivo | Tipo de mudança |
|---|---|
| `frontend/src/api/client.js` | **CRIAR** — módulo centralizado de API |
| `frontend/src/pages/Login.jsx` | Trocar `db.rpc('fn_login')` por `apiLogin()` |
| `frontend/src/pages/Pacientes.jsx` | Trocar inserts Supabase por `apiPost/apiGet` |
| `frontend/src/pages/Triagem.jsx` | Trocar toda cadeia Supabase por `apiPost('/avaliacoes')` |
| `frontend/src/pages/Dashboard.jsx` | Trocar queries Supabase por `apiGet('/dashboard/summary')` |
| `frontend/src/supabaseClient.js` | **REMOVER** |

---

## Cronograma Estimado

| Fase | Responsável | Duração |
|---|---|---|
| Fase 1 — Banco | Grupo BD | 1 dia |
| Fase 2 — Backend | Grupo Backend | 2–3 dias |
| Fase 3 — Frontend | Grupo Frontend | 2–3 dias |
| Fase 4 — Ambiente | Todos | 0,5 dia |
| Fase 5 — Testes | Todos | 1–2 dias |
| **Total** | | **~7–10 dias úteis** |

**Ordem obrigatória:** Fase 1 → Fase 2 → Fase 3 → Fases 4 e 5
