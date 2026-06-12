// ═══════════════════════════════════════════════════════════════════════
// USUÁRIOS (admin) — cadastro e gestão de médicos
// Visível só para admin (App/Sidebar gating); o backend também exige admin.
// ═══════════════════════════════════════════════════════════════════════
function UsuariosPage({ usuario }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState('');
  const [form, setForm] = useState({
    nome: '', email: '', crm: '', especialidade: '', senha: '',
  });
  // Exclusão: usuário-alvo + senha de confirmação do admin
  const [excluir, setExcluir]       = useState(null); // objeto do usuário ou null
  const [senhaConf, setSenhaConf]   = useState('');
  const [erroExcluir, setErroExcluir] = useState('');
  const [deletando, setDeletando]   = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      setUsuarios(await api.getUsuarios());
    } catch (e) {
      console.error('Erro ao carregar usuários:', e);
      setErro(e.message || 'Falha ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function setF(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    if (erro) setErro('');
  }

  async function salvar() {
    setErro('');
    if (!form.nome.trim())  { setErro('Informe o nome.'); return; }
    if (!form.email.trim()) { setErro('Informe o e-mail.'); return; }
    if (form.senha.length < 8) { setErro('A senha deve ter pelo menos 8 caracteres.'); return; }

    setSalvando(true);
    try {
      await api.createUsuario({
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        senha: form.senha,
        crm: form.crm.trim() || null,
        especialidade: form.especialidade.trim() || null,
      });
      setForm({ nome: '', email: '', crm: '', especialidade: '', senha: '' });
      await carregar();
    } catch (e) {
      console.error('Erro ao criar usuário:', e);
      setErro(e.message || 'Não foi possível criar o usuário.');
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(u) {
    try {
      await api.setUsuarioAtivo(u.id, !u.ativo);
      await carregar();
    } catch (e) {
      console.error('Erro ao alterar status:', e);
      alert('Não foi possível alterar o status: ' + (e.message || 'erro'));
    }
  }

  function abrirExcluir(u) {
    setExcluir(u);
    setSenhaConf('');
    setErroExcluir('');
  }
  function fecharExcluir() {
    if (deletando) return;
    setExcluir(null);
    setSenhaConf('');
    setErroExcluir('');
  }
  async function confirmarExcluir() {
    if (!senhaConf) { setErroExcluir('Digite sua senha para confirmar.'); return; }
    setDeletando(true);
    setErroExcluir('');
    try {
      await api.deleteUsuario(excluir.id, senhaConf);
      setExcluir(null);
      setSenhaConf('');
      await carregar();
    } catch (e) {
      console.error('Erro ao excluir:', e);
      setErroExcluir(e.message || 'Não foi possível excluir o usuário.');
    } finally {
      setDeletando(false);
    }
  }

  return (
    <div className="anim-fade-in space-y-5">

      {/* Formulário de cadastro */}
      <Card className="p-6">
        <h3 className="font-display text-[20px] mb-1">Novo médico</h3>
        <p className="text-[12.5px] mb-5" style={{ color: 'var(--muted)' }}>
          O médico criado aqui já pode entrar no sistema com o e-mail e a senha definidos.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome completo" required>
            <input className={`${inputCls} focus-ink`} style={inputStyle} type="text"
              placeholder="Nome do médico" value={form.nome}
              onChange={(e) => setF('nome', e.target.value)} />
          </Field>
          <Field label="E-mail (login)" required>
            <input className={`${inputCls} focus-ink`} style={inputStyle} type="email"
              placeholder="email@exemplo.com" value={form.email}
              onChange={(e) => setF('email', e.target.value)} />
          </Field>
          <Field label="CRM">
            <input className={`${inputCls} focus-ink`} style={inputStyle} type="text"
              placeholder="Ex.: 123456/SP" value={form.crm}
              onChange={(e) => setF('crm', e.target.value)} />
          </Field>
          <Field label="Especialidade">
            <input className={`${inputCls} focus-ink`} style={inputStyle} type="text"
              placeholder="Ex.: Genética médica" value={form.especialidade}
              onChange={(e) => setF('especialidade', e.target.value)} />
          </Field>
          <Field label="Senha inicial" required>
            <input className={`${inputCls} focus-ink`} style={inputStyle} type="password"
              placeholder="Mínimo 8 caracteres" value={form.senha}
              onChange={(e) => setF('senha', e.target.value)} />
          </Field>
        </div>

        {erro && (
          <p className="text-[12.5px] mt-4" style={{ color: 'var(--rust)' }}>{erro}</p>
        )}

        <div className="flex justify-end mt-5">
          <BtnPrimary onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : <>{Icon.plus} Cadastrar médico</>}
          </BtnPrimary>
        </div>
      </Card>

      {/* Lista de usuários */}
      <Card className="overflow-x-auto">
        {loading && (
          <div className="px-6 py-8 text-center text-[13px]" style={{ color: 'var(--muted)' }}>
            Carregando usuários…
          </div>
        )}
        {!loading && usuarios.length === 0 && (
          <div className="px-6 py-8 text-center text-[13px]" style={{ color: 'var(--muted)' }}>
            Nenhum usuário cadastrado.
          </div>
        )}
        {!loading && usuarios.length > 0 && (
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--paper-2)' }}>
                {['Nome', 'E-mail', 'CRM', 'Tipo', 'Status', 'Ações'].map((h, i) => (
                  <th key={i} className="px-5 py-3 text-left text-[10.5px] font-medium uppercase tracking-[0.14em]"
                    style={{ color: 'var(--muted)', borderBottom: '1px solid var(--hair-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => {
                const ehEu = u.id === usuario?.id;
                return (
                  <tr key={u.id}
                    style={{ borderBottom: i < usuarios.length - 1 ? '1px solid var(--hair-soft)' : 'none',
                      opacity: u.ativo ? 1 : 0.55 }}>
                    <td className="px-5 py-4 text-[13.5px] font-medium">
                      {u.nome}{ehEu && <span className="text-[11px] ml-2" style={{ color: 'var(--subtle)' }}>(você)</span>}
                    </td>
                    <td className="px-5 py-4 text-[12.5px]" style={{ color: 'var(--ink-2)' }}>{u.email}</td>
                    <td className="px-5 py-4 text-[12.5px] font-mono" style={{ color: 'var(--muted)' }}>{u.crm || '—'}</td>
                    <td className="px-5 py-4">
                      <Pill tone={u.tipo === 'admin' ? 'honey' : 'sage'}>{u.tipo === 'admin' ? 'Admin' : 'Médico'}</Pill>
                    </td>
                    <td className="px-5 py-4">
                      <Pill tone={u.ativo ? 'sage' : 'neutral'}>{u.ativo ? 'Ativo' : 'Inativo'}</Pill>
                    </td>
                    <td className="px-5 py-4">
                      {ehEu ? (
                        <span className="text-[12px]" style={{ color: 'var(--subtle)' }}>—</span>
                      ) : (
                        <div className="flex items-center gap-4">
                          <button onClick={() => alternarAtivo(u)}
                            className="text-[12px] font-medium lift"
                            style={{ color: u.ativo ? 'var(--rust)' : 'var(--ink)' }}>
                            {u.ativo ? 'Desativar' : 'Reativar'}
                          </button>
                          <button onClick={() => abrirExcluir(u)}
                            className="text-[12px] font-medium lift"
                            style={{ color: 'var(--rust)' }}>
                            Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modal de confirmação de exclusão (pede a senha do admin) */}
      {excluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && fecharExcluir()}>
          <div className="w-full max-w-md rounded-3xl card-shadow anim-fade-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--hair)' }}>
            <div className="px-7 pt-7 pb-5" style={{ borderBottom: '1px solid var(--hair-soft)' }}>
              <h2 className="font-display text-[22px] leading-none">Excluir usuário</h2>
              <p className="text-[12.5px] mt-2" style={{ color: 'var(--muted)' }}>
                Esta ação é <strong>permanente</strong>. O usuário <strong>{excluir.nome}</strong> ({excluir.email})
                será removido do sistema. Para confirmar, digite a <strong>sua</strong> senha de administrador.
              </p>
            </div>

            <div className="px-7 py-6">
              <Field label="Sua senha de administrador" required>
                <input className={`${inputCls} focus-ink`} style={inputStyle} type="password"
                  placeholder="Senha do admin" value={senhaConf} autoFocus
                  onChange={(e) => { setSenhaConf(e.target.value); if (erroExcluir) setErroExcluir(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmarExcluir(); }} />
              </Field>
              {erroExcluir && (
                <p className="text-[12.5px] mt-3" style={{ color: 'var(--rust)' }}>{erroExcluir}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-7 py-5"
              style={{ borderTop: '1px solid var(--hair-soft)' }}>
              <BtnGhost onClick={fecharExcluir}>Cancelar</BtnGhost>
              <button onClick={confirmarExcluir} disabled={deletando}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[13px] font-medium lift"
                style={{ background: 'var(--rust)', color: 'var(--on-ink)',
                  opacity: deletando ? 0.6 : 1 }}>
                {deletando ? 'Excluindo…' : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
