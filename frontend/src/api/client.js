// ═══════════════════════════════════════════════════════════════════════
// CITO — Central API client
// Single surface for all backend communication. No component should call
// fetch() directly. Replaces the old direct-to-Supabase client.
//
// Configure the backend URL here (default: local uvicorn). The backend must
// allow this page's origin in CORS_ORIGINS.
// ═══════════════════════════════════════════════════════════════════════
const API_BASE = (window.CITO_API_BASE || '/api/v1');

const api = {
  _token: null,

  // Set by the app shell. Called when any authenticated request returns 401
  // (expired/invalid JWT) so the UI can drop back to the login screen.
  onUnauthorized: null,

  // ── Session (JWT + identity) in sessionStorage ──────────────────────────
  setSession(token, user) {
    this._token = token;
    try {
      sessionStorage.setItem('cito-token', token);
      sessionStorage.setItem('cito-user', JSON.stringify(user));
    } catch (e) { /* storage unavailable — keep in-memory token */ }
  },
  getToken() {
    if (this._token) return this._token;
    try { this._token = sessionStorage.getItem('cito-token'); } catch (e) {}
    return this._token;
  },
  getUser() {
    try {
      const u = sessionStorage.getItem('cito-user');
      return u ? JSON.parse(u) : null;
    } catch (e) { return null; }
  },
  clearSession() {
    this._token = null;
    try {
      sessionStorage.removeItem('cito-token');
      sessionStorage.removeItem('cito-user');
    } catch (e) {}
  },

  // ── Core request helper (JSON + Bearer auth) ────────────────────────────
  async _request(method, path, body) {
    const headers = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    let payload;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    const res = await fetch(API_BASE + path, { method, headers, body: payload });
    if (res.status === 204) return null;

    let data = null;
    const text = await res.text();
    if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }

    // Session expired/invalid: drop credentials and let the shell return to login.
    if (res.status === 401) {
      this.clearSession();
      if (typeof this.onUnauthorized === 'function') {
        try { this.onUnauthorized(); } catch (e) { /* shell not mounted */ }
      }
    }

    if (!res.ok) {
      const detail = (data && (data.detail || data.title)) || ('Erro ' + res.status);
      const err = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },
  get(path) { return this._request('GET', path); },
  post(path, body) { return this._request('POST', path, body); },

  // ── Auth ────────────────────────────────────────────────────────────────
  async login(email, senha) {
    // OAuth2 password flow: application/x-www-form-urlencoded {username, password}
    const body = new URLSearchParams();
    body.set('username', email);
    body.set('password', senha);
    const res = await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      let detail = 'Credenciais inválidas.';
      try { const d = await res.json(); detail = d.detail || detail; } catch (e) {}
      const err = new Error(detail); err.status = res.status; throw err;
    }
    const data = await res.json(); // {access_token, ..., usuario_id, tipo, nome, crm, especialidade}
    const user = {
      id: data.usuario_id,
      sessao_id: data.sessao_id,
      tipo: data.tipo,
      nome: data.nome,
      crm: data.crm,
      especialidade: data.especialidade,
    };
    this.setSession(data.access_token, user);
    return user;
  },
  async logout(sessaoId) {
    try {
      if (sessaoId != null) {
        await this._request('POST', '/auth/logout?sessao_id=' + encodeURIComponent(sessaoId));
      }
    } catch (e) {
      // Best-effort: clear the local session even if the server call fails.
    } finally {
      this.clearSession();
    }
  },

  // ── Domain endpoints ─────────────────────────────────────────────────────
  getSintomas() { return this.get('/sintomas'); },
  getAcompanhantes() { return this.get('/acompanhantes'); },
  createAcompanhante(body) { return this.post('/acompanhantes', body); },
  updateAcompanhante(id, body) { return this._request('PUT', '/acompanhantes/' + id, body); },

  getPacientes(params) {
    const qs = new URLSearchParams();
    if (params) {
      if (params.nome) qs.set('nome', params.nome);
      if (params.cpf) qs.set('cpf', params.cpf);
      if (params.medico_id) qs.set('medico_id', params.medico_id);
      if (params.incluir_inativos) qs.set('incluir_inativos', 'true');
      if (params.limit) qs.set('limit', params.limit);
      if (params.offset != null) qs.set('offset', params.offset);
    }
    const q = qs.toString();
    return this.get('/pacientes' + (q ? '?' + q : ''));
  },
  createPaciente(body) { return this.post('/pacientes', body); },
  updatePaciente(id, body) { return this._request('PUT', '/pacientes/' + id, body); },
  getPacienteDetalhe(id) { return this.get('/pacientes/' + id); },
  setPacienteAtivo(id, ativo) { return this._request('PATCH', '/pacientes/' + id, { ativo }); },
  deletePaciente(id, senha) { return this._request('DELETE', '/pacientes/' + id, { senha }); },
  uploadFotoPaciente(id, base64) { return this.post('/pacientes/' + id + '/foto', { foto_base64: base64 }); },
  deleteFotoPaciente(id) { return this._request('DELETE', '/pacientes/' + id + '/foto'); },
  getHistorico(pacienteId) { return this.get('/pacientes/' + pacienteId + '/historico'); },

  createAvaliacao(body) { return this.post('/avaliacoes', body); },
  getAvaliacaoDetalhe(id) { return this.get('/avaliacoes/' + id); },

  getDashboardSummary() { return this.get('/dashboard/summary'); },
  getRelatorioAvaliacoes(params) {
    const qs = new URLSearchParams();
    if (params) {
      if (params.data_inicio) qs.set('data_inicio', params.data_inicio);
      if (params.data_fim) qs.set('data_fim', params.data_fim);
      if (params.medico_id) qs.set('medico_id', params.medico_id);
      if (params.sexo) qs.set('sexo', params.sexo);
    }
    const q = qs.toString();
    return this.get('/relatorios/avaliacoes' + (q ? '?' + q : ''));
  },

  getAgendamentos() { return this.get('/agendamentos'); },
  createAgendamento(body) { return this.post('/agendamentos', body); },
  updateAgendamento(id, body) { return this._request('PATCH', '/agendamentos/' + id, body); },
  deleteAgendamento(id) { return this._request('DELETE', '/agendamentos/' + id); },

  // ── Usuários (admin) ─────────────────────────────────────────────────────
  getUsuarios() { return this.get('/usuarios'); },
  createUsuario(body) { return this.post('/usuarios', body); },
  setUsuarioAtivo(id, ativo) { return this._request('PATCH', '/usuarios/' + id, { ativo }); },
  deleteUsuario(id, senhaAdmin) { return this._request('DELETE', '/usuarios/' + id, { senha_admin: senhaAdmin }); },
};
