// ═══════════════════════════════════════════════════════════════════════
// PACIENTES
// ═══════════════════════════════════════════════════════════════════════

// ── Acompanhante em branco ──
const acompVazio = () => ({
  id: Date.now() + Math.random(),
  nome: '', relacao: '', telefone: '', email: '',
});

// ── Modal de cadastro ────────────────────────────────────────────────
function ModalCadastroPaciente({ onClose, onSalvar }) {
  const [aba, setAba]         = useState('paciente'); // 'paciente' | 'acompanhantes'
  const [errors, setErrors]   = useState({});
  const [paciente, setPac]    = useState({
    nome: '', dataNasc: '', sexo: '', cpf: '', celular: '', email: '', responsavel: '',
  });
  const [acomps, setAcomps]   = useState([acompVazio()]);

  // ── Validação ──
  function validarPaciente() {
    const e = {};
    if (!paciente.nome.trim())       e.nome       = 'Obrigatório.';
    if (!paciente.dataNasc)          e.dataNasc   = 'Obrigatório.';
    if (!paciente.sexo)              e.sexo       = 'Obrigatório.';
    if (!paciente.cpf.trim())        e.cpf        = 'Obrigatório.';
    if (!paciente.responsavel.trim()) e.responsavel = 'Obrigatório.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validarAcomps() {
    const e = {};
    acomps.forEach((a, i) => {
      if (!a.nome.trim())    e[`nome_${i}`]    = 'Obrigatório.';
      if (!a.relacao.trim()) e[`relacao_${i}`] = 'Obrigatório.';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Navegar entre abas com validação ──
  function irParaAcomps() {
    if (validarPaciente()) { setAba('acompanhantes'); setErrors({}); }
  }

  // ── Acompanhantes: adicionar / remover / editar ──
  function addAcomp() {
    setAcomps([...acomps, acompVazio()]);
  }

  function removeAcomp(id) {
    if (acomps.length === 1) return; // mínimo 1
    setAcomps(acomps.filter((a) => a.id !== id));
  }

  function editAcomp(id, field, value) {
    setAcomps(acomps.map((a) => a.id === id ? { ...a, [field]: value } : a));
    const key = `${field}_${acomps.findIndex((a) => a.id === id)}`;
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  // ── Salvar ──
  function salvar() {
    if (!validarAcomps()) return;
    onSalvar({ paciente, acompanhantes: acomps });
    onClose();
  }

  // ── Formatação CPF ──
  function fmtCpf(v) {
    return v.replace(/\D/g, '').slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  function fmtTel(v) {
    return v.replace(/\D/g, '').slice(0, 11)
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }

  const RELACOES = ['Mãe','Pai','Avó','Avô','Tia','Tio','Irmã','Irmão','Cuidador(a)','Outro'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl card-shadow anim-fade-up"
        style={{ background: 'var(--surface)', border: '1px solid var(--hair)' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5"
          style={{ borderBottom: '1px solid var(--hair-soft)' }}>
          <div>
            <h2 className="font-display text-[26px] leading-none">Novo paciente</h2>
            <p className="text-[12.5px] mt-1" style={{ color: 'var(--muted)' }}>
              Cadastre o paciente e seus acompanhantes
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center lift"
            style={{ border: '1px solid var(--hair)', color: 'var(--muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}>
            {Icon.x}
          </button>
        </div>

        {/* ── Abas ── */}
        <div className="flex px-7 pt-4 gap-1" style={{ borderBottom: '1px solid var(--hair-soft)' }}>
          {[
            { id: 'paciente',       label: 'Paciente' },
            { id: 'acompanhantes',  label: `Acompanhantes (${acomps.length})` },
          ].map((t) => (
            <button key={t.id}
              onClick={() => { if (t.id === 'acompanhantes') irParaAcomps(); else { setAba('paciente'); setErrors({}); } }}
              className="px-4 pb-3 text-[13px] font-medium relative lift"
              style={{ color: aba === t.id ? 'var(--ink)' : 'var(--subtle)' }}>
              {t.label}
              {aba === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t"
                  style={{ background: 'var(--ink)' }} />
              )}
            </button>
          ))}
        </div>

        {/* ── Conteúdo scrollável ── */}
        <div className="flex-1 overflow-y-auto px-7 py-6">

          {/* ── ABA PACIENTE ── */}
          {aba === 'paciente' && (
            <div className="space-y-1">
              <Field label="Nome completo" required error={errors.nome}>
                <input className={`${inputCls} focus-ink`} style={inputStyle}
                  type="text" placeholder="Nome completo do paciente"
                  value={paciente.nome}
                  onChange={(e) => { setPac({ ...paciente, nome: e.target.value }); if (errors.nome) setErrors((v) => ({ ...v, nome: '' })); }} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Data de nascimento" required error={errors.dataNasc}>
                  <input className={`${inputCls} focus-ink`} style={inputStyle} type="date"
                    value={paciente.dataNasc}
                    onChange={(e) => { setPac({ ...paciente, dataNasc: e.target.value }); if (errors.dataNasc) setErrors((v) => ({ ...v, dataNasc: '' })); }} />
                </Field>

                <Field label="Sexo biológico" required error={errors.sexo}>
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    {[['M','Masc.'],['F','Fem.']].map(([v, lab]) => (
                      <button key={v} type="button"
                        onClick={() => { setPac({ ...paciente, sexo: v }); if (errors.sexo) setErrors((x) => ({ ...x, sexo: '' })); }}
                        className="py-2.5 rounded-2xl text-[13px] font-medium lift"
                        style={{
                          background: paciente.sexo === v ? 'var(--ink)' : 'var(--surface)',
                          color: paciente.sexo === v ? 'var(--on-ink)' : 'var(--ink-2)',
                          border: paciente.sexo === v ? '1px solid var(--ink)' : '1px solid var(--hair)',
                        }}>{lab}</button>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="CPF" required error={errors.cpf}>
                  <input className={`${inputCls} focus-ink font-mono`} style={inputStyle}
                    type="text" placeholder="000.000.000-00"
                    value={paciente.cpf}
                    onChange={(e) => { setPac({ ...paciente, cpf: fmtCpf(e.target.value) }); if (errors.cpf) setErrors((v) => ({ ...v, cpf: '' })); }} />
                </Field>

                <Field label="Celular">
                  <input className={`${inputCls} focus-ink font-mono`} style={inputStyle}
                    type="tel" placeholder="(00) 9 0000-0000"
                    value={paciente.celular}
                    onChange={(e) => setPac({ ...paciente, celular: fmtTel(e.target.value) })} />
                </Field>
              </div>

              <Field label="E-mail (opcional)">
                <input className={`${inputCls} focus-ink`} style={inputStyle}
                  type="email" placeholder="email@exemplo.com"
                  value={paciente.email}
                  onChange={(e) => setPac({ ...paciente, email: e.target.value })} />
              </Field>

              <Field label="Responsável legal" required error={errors.responsavel}>
                <input className={`${inputCls} focus-ink`} style={inputStyle}
                  type="text" placeholder="Nome do pai, mãe ou tutor"
                  value={paciente.responsavel}
                  onChange={(e) => { setPac({ ...paciente, responsavel: e.target.value }); if (errors.responsavel) setErrors((v) => ({ ...v, responsavel: '' })); }} />
              </Field>
            </div>
          )}

          {/* ── ABA ACOMPANHANTES ── */}
          {aba === 'acompanhantes' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12.5px]" style={{ color: 'var(--muted)' }}>
                  Cada acompanhante pode ter uma triagem vinculada. Um mesmo acompanhante não pode repetir triagem para o mesmo paciente.
                </p>
              </div>

              {acomps.map((a, i) => (
                <div key={a.id} className="rounded-2xl p-5 relative"
                  style={{ border: '1px solid var(--hair)', background: 'var(--paper-2)' }}>

                  {/* Cabeçalho do card */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
                        style={{ background: 'var(--ink)', color: 'var(--on-ink)' }}>
                        {i + 1}
                      </div>
                      <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
                        {a.nome || `Acompanhante ${i + 1}`}
                      </span>
                    </div>
                    {acomps.length > 1 && (
                      <button onClick={() => removeAcomp(a.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center lift"
                        style={{ border: '1px solid var(--hair)', color: 'var(--subtle)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--rust)'; e.currentTarget.style.borderColor = 'var(--rust)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--subtle)'; e.currentTarget.style.borderColor = 'var(--hair)'; }}>
                        {Icon.x}
                      </button>
                    )}
                  </div>

                  <Field label="Nome completo" required error={errors[`nome_${i}`]}>
                    <input className={`${inputCls} focus-ink`} style={inputStyle}
                      type="text" placeholder="Nome do acompanhante"
                      value={a.nome}
                      onChange={(e) => editAcomp(a.id, 'nome', e.target.value)} />
                  </Field>

                  <Field label="Relação com o paciente" required error={errors[`relacao_${i}`]}>
                    <div className="flex flex-wrap gap-2">
                      {RELACOES.map((r) => (
                        <button key={r} type="button"
                          onClick={() => editAcomp(a.id, 'relacao', r)}
                          className="px-3 py-1.5 rounded-full text-[12px] font-medium lift"
                          style={{
                            background: a.relacao === r ? 'var(--ink)' : 'var(--surface)',
                            color: a.relacao === r ? 'var(--on-ink)' : 'var(--ink-2)',
                            border: a.relacao === r ? '1px solid var(--ink)' : '1px solid var(--hair)',
                          }}>{r}</button>
                      ))}
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Telefone">
                      <input className={`${inputCls} focus-ink font-mono`} style={inputStyle}
                        type="tel" placeholder="(00) 9 0000-0000"
                        value={a.telefone}
                        onChange={(e) => editAcomp(a.id, 'telefone', fmtTel(e.target.value))} />
                    </Field>
                    <Field label="E-mail">
                      <input className={`${inputCls} focus-ink`} style={inputStyle}
                        type="email" placeholder="email@exemplo.com"
                        value={a.email}
                        onChange={(e) => editAcomp(a.id, 'email', e.target.value)} />
                    </Field>
                  </div>
                </div>
              ))}

              {/* Botão adicionar acompanhante */}
              <button onClick={addAcomp}
                className="w-full py-3.5 rounded-2xl text-[13px] font-medium lift flex items-center justify-center gap-2"
                style={{ border: '1px dashed var(--hair)', color: 'var(--muted)', background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.color = 'var(--ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--hair)'; e.currentTarget.style.color = 'var(--muted)'; }}>
                {Icon.plus} Adicionar outro acompanhante
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-7 py-5"
          style={{ borderTop: '1px solid var(--hair-soft)' }}>
          <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
          <div className="flex items-center gap-2">
            {aba === 'paciente' && (
              <BtnPrimary onClick={irParaAcomps}>
                Próximo — Acompanhantes {Icon.chevronRight}
              </BtnPrimary>
            )}
            {aba === 'acompanhantes' && (
              <>
                <BtnGhost onClick={() => { setAba('paciente'); setErrors({}); }}>
                  {Icon.chevronLeft} Voltar
                </BtnGhost>
                <BtnPrimary onClick={salvar}>
                  {Icon.check} Salvar cadastro
                </BtnPrimary>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════
function PacientesPage() {
  const [q, setQ]             = useState('');
  const [modal, setModal]     = useState(false);
  const [pacientes, setPacientes] = useState([
    { nome: 'Lívia Andrade',   nasc: '12/01/2019', cpf: '098.***.***-22', cel: '(11) 9 8847-2901', ult: '14/05/2026', risco: 'encaminhar', score: 0.61, acomps: 2 },
    { nome: 'Joaquim Pessoa',  nasc: '03/03/2015', cpf: '124.***.***-09', cel: '(11) 9 9112-0044', ult: '02/05/2026', risco: 'baixo',      score: 0.28, acomps: 1 },
    { nome: 'Beatriz Coelho',  nasc: '24/07/2020', cpf: '208.***.***-71', cel: '(21) 9 8222-1100', ult: '13/05/2026', risco: 'encaminhar', score: 0.58, acomps: 1 },
    { nome: 'Davi Reinaldo',   nasc: '11/04/2018', cpf: '311.***.***-65', cel: '(11) 9 7700-3290', ult: '13/05/2026', risco: 'baixo',      score: 0.42, acomps: 3 },
    { nome: 'Sofia Vidigal',   nasc: '18/09/2019', cpf: '423.***.***-31', cel: '(11) 9 9482-2210', ult: '11/05/2026', risco: 'encaminhar', score: 0.67, acomps: 1 },
    { nome: 'Théo Ramires',    nasc: '02/06/2016', cpf: '512.***.***-90', cel: '(11) 9 9091-7700', ult: '12/05/2026', risco: 'baixo',      score: 0.31, acomps: 2 },
    { nome: 'Marina Tobias',   nasc: '29/11/2017', cpf: '600.***.***-43', cel: '(11) 9 8131-6622', ult: '09/05/2026', risco: 'baixo',      score: 0.19, acomps: 1 },
  ]);

  function handleSalvar({ paciente, acompanhantes }) {
    const [y, m, d] = paciente.dataNasc.split('-');
    const novo = {
      nome:   paciente.nome,
      nasc:   `${d}/${m}/${y}`,
      cpf:    paciente.cpf,
      cel:    paciente.celular || '—',
      ult:    '—',
      risco:  'baixo',
      score:  0,
      acomps: acompanhantes.length,
    };
    setPacientes([...pacientes, novo]);
  }

  const filtered = pacientes.filter((p) =>
    !q || p.nome.toLowerCase().includes(q.toLowerCase()) || p.cpf.includes(q)
  );

  return (
    <div className="anim-fade-in space-y-5">

      {/* Barra de ferramentas */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>{Icon.search}</span>
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou CPF…"
              className="w-full rounded-2xl pl-11 pr-4 py-3 text-[14px] outline-none focus-ink lift"
              style={inputStyle} />
          </div>
          <BtnGhost>{Icon.chevronDown} Filtros</BtnGhost>
          <BtnGhost>{Icon.chevronDown} Exportar CSV</BtnGhost>
          <BtnPrimary onClick={() => setModal(true)}>{Icon.plus} Novo paciente</BtnPrimary>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--paper-2)' }}>
              {['#','Paciente','Nascimento','CPF','Celular','Acomp.','Último escore','Status','Ações'].map((h, i) => (
                <th key={i} className="px-5 py-3 text-left text-[10.5px] font-medium uppercase tracking-[0.14em]"
                  style={{ color: 'var(--muted)', borderBottom: '1px solid var(--hair-soft)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={i} className="lift"
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--hair-soft)' : 'none' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                <td className="px-5 py-4 font-mono text-[12px]" style={{ color: 'var(--subtle)' }}>
                  {String(i + 1).padStart(3, '0')}
                </td>
                <td className="px-5 py-4 text-[13.5px] font-medium">{p.nome}</td>
                <td className="px-5 py-4 text-[12.5px] font-mono" style={{ color: 'var(--ink-2)' }}>{p.nasc}</td>
                <td className="px-5 py-4 text-[12.5px] font-mono" style={{ color: 'var(--muted)' }}>{p.cpf}</td>
                <td className="px-5 py-4 text-[12.5px] font-mono" style={{ color: 'var(--ink-2)' }}>{p.cel}</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono"
                    style={{ background: 'var(--paper-2)', border: '1px solid var(--hair)', color: 'var(--muted)' }}>
                    {Icon.users} {p.acomps}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="font-mono num-tabular text-[13px] font-medium"
                    style={{ color: p.risco === 'encaminhar' ? 'var(--ink)' : 'var(--subtle)' }}>
                    {p.score > 0 ? p.score.toFixed(2) : '—'}
                  </span>
                  {p.ult !== '—' && (
                    <span className="text-[11px] ml-2 font-mono" style={{ color: 'var(--muted)' }}>· {p.ult}</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {p.score > 0
                    ? <Pill tone={p.risco === 'encaminhar' ? 'honey' : 'sage'}>{p.risco === 'encaminhar' ? 'Encaminhar' : 'Baixo risco'}</Pill>
                    : <span className="text-[12px] font-mono" style={{ color: 'var(--subtle)' }}>Sem triagem</span>}
                </td>
                <td className="px-5 py-4">
                  <button className="text-[12px] font-medium lift" style={{ color: 'var(--ink)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}>
                    Abrir →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modal */}
      {modal && (
        <ModalCadastroPaciente
          onClose={() => setModal(false)}
          onSalvar={handleSalvar}
        />
      )}
    </div>
  );
}