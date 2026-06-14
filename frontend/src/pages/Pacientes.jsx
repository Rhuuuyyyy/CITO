// ═══════════════════════════════════════════════════════════════════════
// PACIENTES
// ═══════════════════════════════════════════════════════════════════════

const acompVazio = () => ({
  id: Date.now() + Math.random(),
  nome: '', relacao: '', telefone: '', email: '',
});

const ETNIAS = [
  ['branca', 'Branca'], ['preta', 'Preta'], ['parda', 'Parda'],
  ['amarela', 'Amarela'], ['indigena', 'Indígena'], ['nao_declarado', 'Não declarado'],
];
const ESCOLARIDADES = [
  ['sem_escolaridade', 'Sem escolaridade'], ['educacao_infantil', 'Educação infantil'],
  ['fundamental_incompleto', 'Fundamental incompleto'], ['fundamental_completo', 'Fundamental completo'],
  ['medio_incompleto', 'Médio incompleto'], ['medio_completo', 'Médio completo'],
  ['superior_incompleto', 'Superior incompleto'], ['superior_completo', 'Superior completo'],
  ['nao_informado', 'Não informado'],
];
const selectArrow = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6862' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")";

function ModalCadastroPaciente({ onClose, onSalvar, onSalvarEdicao, pacienteEdit }) {
  const isEdit = !!pacienteEdit;
  const [aba, setAba]         = useState('paciente');
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [errors, setErrors]   = useState({});
  const [paciente, setPac]    = useState(() => (isEdit ? {
    nome: pacienteEdit.nome || '',
    dataNasc: pacienteEdit.data_nascimento || '',
    sexo: pacienteEdit.sexo || '',
    cpf: '',
    celular: pacienteEdit.telefone || '', email: '',
    etnia: pacienteEdit.etnia || '',
    escolaridade: pacienteEdit.escolaridade || '',
    prematuro: !!pacienteEdit.prematuro,
    tem_diagnostico_autismo: !!pacienteEdit.tem_diagnostico_autismo,
    tem_diagnostico_tdah: !!pacienteEdit.tem_diagnostico_tdah,
    outras_comorbidades: pacienteEdit.outras_comorbidades || '',
    medicamentos_uso: pacienteEdit.medicamentos_uso || '',
    diagnostico_confirmado_fxs: !!pacienteEdit.diagnostico_confirmado_fxs,
  } : {
    nome: '', dataNasc: '', sexo: '', cpf: '', celular: '', email: '',
    etnia: '', escolaridade: '', prematuro: false,
    tem_diagnostico_autismo: false, tem_diagnostico_tdah: false,
    outras_comorbidades: '', medicamentos_uso: '',
  }));
  const [acomps, setAcomps]   = useState([acompVazio()]);
  const [fotoBase64, setFotoBase64] = useState(null);
  const [modalFoto, setModalFoto]   = useState(false);

  function validarPaciente() {
    const e = {};
    if (!paciente.nome.trim()) e.nome     = 'Obrigatório.';
    if (!paciente.dataNasc)    e.dataNasc = 'Obrigatório.';
    if (!paciente.sexo)        e.sexo     = 'Obrigatório.';
    if (!isEdit && !paciente.cpf.trim()) e.cpf = 'Obrigatório.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function salvarEdicao() {
    if (!validarPaciente()) return;
    const p = paciente;
    const body = {
      nome: p.nome,
      data_nascimento: p.dataNasc,
      sexo: p.sexo,
      etnia: p.etnia || null,
      escolaridade: p.escolaridade || null,
      prematuro: p.prematuro,
      tem_diagnostico_autismo: p.tem_diagnostico_autismo,
      tem_diagnostico_tdah: p.tem_diagnostico_tdah,
      outras_comorbidades: p.outras_comorbidades?.trim() || null,
      medicamentos_uso: p.medicamentos_uso?.trim() || null,
      diagnostico_confirmado_fxs: p.diagnostico_confirmado_fxs,
      telefone: p.celular?.trim() || null,
      municipio_residencia: pacienteEdit.municipio_residencia || null,
      uf_residencia: pacienteEdit.uf_residencia || null,
    };
    const cpfDigits = (p.cpf || '').replace(/\D/g, '');
    if (cpfDigits.length === 11) body.cpf = cpfDigits;
    setSalvandoEdit(true);
    try {
      await onSalvarEdicao(body);
      onClose();
    } catch (err) {
      console.error('Erro ao editar paciente:', err);
      alert('Não foi possível salvar as alterações: ' + (err.message || 'erro desconhecido'));
    } finally {
      setSalvandoEdit(false);
    }
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

  function irParaAcomps() {
    if (validarPaciente()) { setAba('acompanhantes'); setErrors({}); }
  }

  function addAcomp() { setAcomps([...acomps, acompVazio()]); }

  function removeAcomp(id) {
    if (acomps.length === 1) return;
    setAcomps(acomps.filter((a) => a.id !== id));
  }

  function editAcomp(id, field, value) {
    setAcomps(acomps.map((a) => a.id === id ? { ...a, [field]: value } : a));
    const key = `${field}_${acomps.findIndex((a) => a.id === id)}`;
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  function salvar() {
    if (!validarAcomps()) return;
    onSalvar({ paciente, acompanhantes: acomps, fotoBase64 });
    onClose();
  }

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

        <div className="flex items-center justify-between px-7 pt-7 pb-5"
          style={{ borderBottom: '1px solid var(--hair-soft)' }}>
          <div>
            <h2 className="font-display text-[26px] leading-none">{isEdit ? 'Editar paciente' : 'Novo paciente'}</h2>
            <p className="text-[12.5px] mt-1" style={{ color: 'var(--muted)' }}>
              {isEdit ? 'Atualize os dados do paciente' : 'Cadastre o paciente e seus acompanhantes'}
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

        {!isEdit && (
        <div className="flex px-7 pt-4 gap-1" style={{ borderBottom: '1px solid var(--hair-soft)' }}>
          {[
            { id: 'paciente',      label: 'Paciente' },
            { id: 'acompanhantes', label: `Acompanhantes (${acomps.length})` },
          ].map((t) => (
            <button key={t.id}
              onClick={() => {
                if (t.id === 'acompanhantes') irParaAcomps();
                else { setAba('paciente'); setErrors({}); }
              }}
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
        )}

        <div className="flex-1 overflow-y-auto px-7 py-6">

          {aba === 'paciente' && (
            <div className="space-y-1">

              {!isEdit && (
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ border: '1px solid var(--hair)', background: 'var(--paper-2)' }}>
                  {fotoBase64
                    ? <img src={fotoBase64} alt="Foto" className="w-full h-full object-cover" />
                    : <span className="text-[26px]" style={{ color: 'var(--subtle)' }}>👤</span>
                  }
                </div>
                <div className="flex flex-col gap-1.5">
                  <BtnGhost onClick={() => setModalFoto(true)}>
                    {fotoBase64 ? 'Trocar foto' : 'Adicionar foto'}
                  </BtnGhost>
                  {fotoBase64 && (
                    <button onClick={() => setFotoBase64(null)}
                      className="text-[12px] lift"
                      style={{ color: 'var(--subtle)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--rust)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--subtle)'; }}>
                      Remover foto
                    </button>
                  )}
                </div>
              </div>
              )}

              {modalFoto && (
                <ModalFotoCaptura
                  pacienteId={null}
                  nomeAtual={paciente.nome || 'Novo paciente'}
                  onSalvar={(base64) => { setFotoBase64(base64); setModalFoto(false); }}
                  onClose={() => setModalFoto(false)}
                />
              )}

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
                <Field label="CPF" required={!isEdit} error={errors.cpf}>
                  <input className={`${inputCls} focus-ink font-mono`} style={inputStyle}
                    type="text" placeholder={isEdit ? 'Em branco = manter atual' : '000.000.000-00'}
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

              <div className="pt-4 mt-2" style={{ borderTop: '1px solid var(--hair-soft)' }}>
                <div className="text-[10.5px] font-medium uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--muted)' }}>
                  Dados clínicos (opcional)
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Etnia">
                    <select className={`${inputCls} focus-ink appearance-none`}
                      style={{ ...inputStyle, backgroundImage: selectArrow, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                      value={paciente.etnia}
                      onChange={(e) => setPac({ ...paciente, etnia: e.target.value })}>
                      <option value="">Selecione</option>
                      {ETNIAS.map(([v, lab]) => <option key={v} value={v}>{lab}</option>)}
                    </select>
                  </Field>
                  <Field label="Escolaridade">
                    <select className={`${inputCls} focus-ink appearance-none`}
                      style={{ ...inputStyle, backgroundImage: selectArrow, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                      value={paciente.escolaridade}
                      onChange={(e) => setPac({ ...paciente, escolaridade: e.target.value })}>
                      <option value="">Selecione</option>
                      {ESCOLARIDADES.map(([v, lab]) => <option key={v} value={v}>{lab}</option>)}
                    </select>
                  </Field>
                </div>

                <div className="flex flex-wrap gap-2 mt-2 mb-4">
                  {[
                    ['prematuro',               'Prematuro (<37 sem.)'],
                    ['tem_diagnostico_autismo',  'Diagnóstico de autismo'],
                    ['tem_diagnostico_tdah',     'Diagnóstico de TDAH'],
                    ...(isEdit ? [['diagnostico_confirmado_fxs', 'FXS confirmado']] : []),
                  ].map(([campo, lab]) => (
                    <button key={campo} type="button"
                      onClick={() => setPac((p) => ({ ...p, [campo]: !p[campo] }))}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium lift"
                      style={{
                        background: paciente[campo] ? 'var(--ink)' : 'var(--surface)',
                        color: paciente[campo] ? 'var(--on-ink)' : 'var(--ink-2)',
                        border: paciente[campo] ? '1px solid var(--ink)' : '1px solid var(--hair)',
                      }}>{lab}</button>
                  ))}
                </div>

                <Field label="Outras comorbidades">
                  <input className={`${inputCls} focus-ink`} style={inputStyle}
                    type="text" placeholder="Ex.: epilepsia, cardiopatia…"
                    value={paciente.outras_comorbidades}
                    onChange={(e) => setPac({ ...paciente, outras_comorbidades: e.target.value })} />
                </Field>

                <Field label="Medicamentos em uso">
                  <input className={`${inputCls} focus-ink`} style={inputStyle}
                    type="text" placeholder="Ex.: metilfenidato, risperidona…"
                    value={paciente.medicamentos_uso}
                    onChange={(e) => setPac({ ...paciente, medicamentos_uso: e.target.value })} />
                </Field>
              </div>
            </div>
          )}

          {aba === 'acompanhantes' && (
            <div className="space-y-5">
              <p className="text-[12.5px]" style={{ color: 'var(--muted)' }}>
                Cada acompanhante pode ter uma triagem vinculada. Um mesmo acompanhante não pode repetir triagem para o mesmo paciente.
              </p>

              {acomps.map((a, i) => (
                <div key={a.id} className="rounded-2xl p-5 relative"
                  style={{ border: '1px solid var(--hair)', background: 'var(--paper-2)' }}>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
                        style={{ background: 'var(--ink)', color: 'var(--on-ink)' }}>{i + 1}</div>
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

        <div className="flex items-center justify-between px-7 py-5"
          style={{ borderTop: '1px solid var(--hair-soft)' }}>
          <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
          <div className="flex items-center gap-2">
            {isEdit ? (
              <BtnPrimary onClick={salvarEdicao} disabled={salvandoEdit}>
                {salvandoEdit ? 'Salvando…' : <>{Icon.check} Salvar alterações</>}
              </BtnPrimary>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ProntInfo = ({ label, valor }) => (
  <div>
    <span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>{label}</span>
    <p>{valor}</p>
  </div>
);

function ModalEditarAcompanhante({ acompanhante, onClose, onSalvo }) {
  const [form, setForm] = useState({
    nome: acompanhante.nome || '',
    telefone: acompanhante.telefone || '',
    email: acompanhante.email || '',
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (form.nome.trim().length < 2) { setErro('Informe o nome completo.'); return; }
    setSalvando(true);
    try {
      await api.updateAcompanhante(acompanhante.id, {
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
      });
      onSalvo();
    } catch (err) {
      console.error('Erro ao editar acompanhante:', err);
      setErro(err.message || 'Não foi possível salvar.');
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 anim-fade-in"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm flex flex-col rounded-3xl card-shadow anim-fade-up"
        style={{ background: 'var(--surface)', border: '1px solid var(--hair)' }}>
        <div className="flex items-center justify-between px-7 pt-7 pb-5"
          style={{ borderBottom: '1px solid var(--hair-soft)' }}>
          <h2 className="font-display text-[22px] leading-none">Editar acompanhante</h2>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center lift"
            style={{ border: '1px solid var(--hair)', color: 'var(--muted)' }}>{Icon.x}</button>
        </div>
        <div className="px-7 py-6 space-y-1">
          {erro && (
            <div className="rounded-2xl px-4 py-3 mb-3 text-[12.5px]"
              style={{ background: 'var(--rust-soft)', color: 'var(--rust)' }}>{erro}</div>
          )}
          <Field label="Nome completo" required>
            <input className={`${inputCls} focus-ink`} style={inputStyle} type="text"
              value={form.nome} onChange={(e) => { setForm({ ...form, nome: e.target.value }); setErro(''); }} />
          </Field>
          <Field label="Telefone">
            <input className={`${inputCls} focus-ink font-mono`} style={inputStyle} type="tel"
              placeholder="(00) 9 0000-0000"
              value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </Field>
          <Field label="E-mail">
            <input className={`${inputCls} focus-ink`} style={inputStyle} type="email"
              placeholder="email@exemplo.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
        </div>
        <div className="flex items-center justify-between px-7 py-5"
          style={{ borderTop: '1px solid var(--hair-soft)' }}>
          <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
          <BtnPrimary onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : <>{Icon.check} Salvar</>}
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

function ModalProntuario({ paciente, onClose, onChanged, onEditar }) {
  const [detalhe, setDetalhe]       = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [fotoUrl, setFotoUrl]       = useState(null);
  const [arquivando, setArquivando] = useState(false);
  const [excluindo, setExcluindo]   = useState(false);
  const [senhaDel, setSenhaDel]     = useState('');
  const [erroDel, setErroDel]       = useState('');
  const [delLoading, setDelLoading] = useState(false);
  const [imprimindo, setImprimindo] = useState(null);
  const [editandoAcomp, setEditandoAcomp] = useState(null);
  const [excluindoTri, setExcluindoTri] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getPacienteDetalhe(paciente.id).catch(() => null),
      api.getHistorico(paciente.id).then((d) => d.items || []).catch(() => []),
    ]).then(([det, hist]) => {
      setDetalhe(det);
      setAvaliacoes(hist);
      const foto = FotoStore.carregar(paciente.id);
      if (foto) setFotoUrl(foto);
      setLoading(false);
    });
  }, [paciente.id]);

  function recarregarDetalhe() {
    api.getPacienteDetalhe(paciente.id).then((d) => setDetalhe(d)).catch(() => {});
  }

  async function excluirTriagem(avaliacaoId) {
    if (!window.confirm('Excluir esta triagem? A ação é permanente e remove o laudo e as respostas desta avaliação.')) return;
    setExcluindoTri(avaliacaoId);
    try {
      await api.deleteAvaliacao(avaliacaoId);
      const d = await api.getHistorico(paciente.id).catch(() => ({ items: [] }));
      setAvaliacoes(d.items || []);
      recarregarDetalhe();
    } catch (err) {
      console.error('Erro ao excluir triagem:', err);
      alert('Não foi possível excluir: ' + (err.message || 'erro desconhecido'));
    } finally {
      setExcluindoTri(null);
    }
  }

  const limiar  = paciente.sexo === 'M' ? 0.56 : 0.55;
  const fmtData = (s) => (s ? s.split('-').reverse().join('/') : '—');
  const labelDe = (lista, v) => (lista.find(([val]) => val === v) || [null, v])[1] || '—';
  const simNao  = (b) => (b ? 'Sim' : 'Não');

  async function imprimirLaudo(avaliacaoId) {
    setImprimindo(avaliacaoId);
    try {
      const av  = await api.getAvaliacaoDetalhe(avaliacaoId);
      const cat = (window.LAUDO && window.LAUDO.SINTOMA_DESCRICAO) || {};
      const respostas = {};
      (av.sintomas || []).forEach((s) => {
        const id = Object.keys(cat).find((k) => cat[k] === s.descricao);
        if (id) respostas[id] = s.presente ? 1 : 0;
      });
      const hist = av.historico_familiar || {};
      await window.gerarLaudoPDF({
        nome: av.paciente_nome,
        sexo: av.paciente_sexo,
        dataNasc: av.paciente_data_nascimento,
        dataAvaliacao: av.data_avaliacao,
        acomp: {
          nome: av.acompanhante_nome,
          relacao: av.acompanhante_relacao,
          telefone: av.acompanhante_telefone,
          email: av.acompanhante_email,
        },
        respostas,
        historico: hist,
        historicoOutros: hist.descricao_outros || '',
        scoreOverride: av.score_final,
      });
    } catch (err) {
      console.error('Erro ao reimprimir laudo:', err);
      alert('Não foi possível gerar o PDF: ' + (err.message || 'erro desconhecido'));
    } finally {
      setImprimindo(null);
    }
  }

  async function arquivarToggle() {
    setArquivando(true);
    try {
      await api.setPacienteAtivo(paciente.id, !paciente.ativo);
      onChanged && onChanged();
    } catch (err) {
      alert('Não foi possível alterar o status: ' + (err.message || 'erro'));
    } finally {
      setArquivando(false);
    }
  }

  function abrirExcluir() { setExcluindo(true); setSenhaDel(''); setErroDel(''); }
  function fecharExcluir() { if (!delLoading) { setExcluindo(false); setSenhaDel(''); setErroDel(''); } }
  async function confirmarExcluir() {
    if (!senhaDel) { setErroDel('Digite sua senha para confirmar.'); return; }
    setDelLoading(true); setErroDel('');
    try {
      await api.deletePaciente(paciente.id, senhaDel);
      onChanged && onChanged();
    } catch (err) {
      setErroDel(err.message || 'Não foi possível excluir o paciente.');
    } finally {
      setDelLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl card-shadow anim-fade-up"
        style={{ background: 'var(--surface)', border: '1px solid var(--hair)' }}>

        <div className="flex items-center justify-between px-7 pt-7 pb-5"
          style={{ borderBottom: '1px solid var(--hair-soft)' }}>
          <div className="flex items-center gap-4">
            <FotoAvatar
              pacienteId={paciente.id}
              nome={paciente.nome}
              size={56}
              editavel={true}
              onAtualizar={(base64) => setFotoUrl(base64)}
            />
            <div>
              <h2 className="font-display text-[22px] leading-none">{paciente.nome}</h2>
              <p className="text-[12.5px] mt-1" style={{ color: 'var(--muted)' }}>
                Prontuário · {paciente.sexo === 'M' ? 'Masculino' : 'Feminino'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center lift"
            style={{ border: '1px solid var(--hair)', color: 'var(--muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}>
            {Icon.x}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">
          {loading && <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Carregando…</p>}

          {!loading && detalhe && (
            <>
              <div>
                <h3 className="text-[10.5px] font-medium uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--muted)' }}>Dados do paciente</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
                  <ProntInfo label="Sexo"               valor={detalhe.sexo === 'M' ? 'Masculino' : 'Feminino'} />
                  <ProntInfo label="Nascimento"          valor={fmtData(detalhe.data_nascimento)} />
                  <ProntInfo label="Idade"               valor={detalhe.idade_anos != null ? `${detalhe.idade_anos} anos` : '—'} />
                  <ProntInfo label="CPF"                 valor={detalhe.cpf_masked || '—'} />
                  <ProntInfo label="Etnia"               valor={detalhe.etnia ? labelDe(ETNIAS, detalhe.etnia) : '—'} />
                  <ProntInfo label="Escolaridade"        valor={detalhe.escolaridade ? labelDe(ESCOLARIDADES, detalhe.escolaridade) : '—'} />
                  <ProntInfo label="UF de residência"    valor={detalhe.uf_residencia || '—'} />
                  <ProntInfo label="Prematuro"           valor={simNao(detalhe.prematuro)} />
                  <ProntInfo label="Diagnóstico autismo" valor={simNao(detalhe.tem_diagnostico_autismo)} />
                  <ProntInfo label="Diagnóstico TDAH"    valor={simNao(detalhe.tem_diagnostico_tdah)} />
                  <ProntInfo label="FXS confirmado"      valor={simNao(detalhe.diagnostico_confirmado_fxs)} />
                </div>
                {(detalhe.outras_comorbidades || detalhe.medicamentos_uso) && (
                  <div className="space-y-3 mt-3 text-[13px]">
                    {detalhe.outras_comorbidades && <ProntInfo label="Outras comorbidades" valor={detalhe.outras_comorbidades} />}
                    {detalhe.medicamentos_uso    && <ProntInfo label="Medicamentos em uso"  valor={detalhe.medicamentos_uso} />}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-[10.5px] font-medium uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--muted)' }}>
                  {detalhe.acompanhantes?.length > 1 ? 'Acompanhantes' : 'Acompanhante'}
                </h3>
                {(!detalhe.acompanhantes || detalhe.acompanhantes.length === 0) && (
                  <p className="text-[13px]" style={{ color: 'var(--subtle)' }}>Nenhum acompanhante vinculado.</p>
                )}
                <div className="space-y-3">
                  {(detalhe.acompanhantes || []).map((a) => (
                    <div key={a.id} className="rounded-2xl p-4"
                      style={{ border: '1px solid var(--hair)', background: 'var(--paper-2)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] flex-1 min-w-0">
                          <ProntInfo label="Nome"    valor={a.nome} />
                          <ProntInfo label="Relação" valor={a.relacao || '—'} />
                          {a.telefone && <ProntInfo label="Telefone" valor={a.telefone} />}
                          {a.email    && <ProntInfo label="E-mail"   valor={a.email} />}
                        </div>
                        <button onClick={() => setEditandoAcomp(a)}
                          className="text-[12px] font-medium lift flex-shrink-0" style={{ color: 'var(--ink)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}>
                          {Icon.edit} Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <h3 className="text-[10.5px] font-medium uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--muted)' }}>Histórico de triagens</h3>
            {!loading && avaliacoes.length === 0 && (
              <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Nenhuma triagem registrada para este paciente.</p>
            )}
            <div className="space-y-3">
              {avaliacoes.map((a) => {
                const score     = a.score_final != null ? Number(a.score_final) : null;
                const encaminha = !!a.recomenda_exame;
                return (
                  <div key={a.avaliacao_id} className="rounded-2xl p-5"
                    style={{ border: '1px solid var(--hair)', background: 'var(--paper-2)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12.5px] font-mono" style={{ color: 'var(--muted)' }}>
                        {new Date(a.data_avaliacao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Pill tone={encaminha ? 'honey' : 'sage'}>
                        {encaminha ? 'Encaminhar' : 'Baixo risco'}
                      </Pill>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-[28px] num-tabular leading-none">
                        {score != null ? score.toFixed(2) : '—'}
                      </span>
                      <span className="text-[11.5px]" style={{ color: 'var(--muted)' }}>
                        limiar {paciente.sexo === 'M' ? '♂' : '♀'} {limiar}
                      </span>
                    </div>
                    <div className="mt-4 pt-3 flex justify-between items-center" style={{ borderTop: '1px solid var(--hair-soft)' }}>
                      <button onClick={() => excluirTriagem(a.avaliacao_id)}
                        disabled={excluindoTri === a.avaliacao_id}
                        className="text-[12px] font-medium lift"
                        style={{ color: 'var(--rust)', opacity: excluindoTri === a.avaliacao_id ? 0.6 : 1 }}>
                        {excluindoTri === a.avaliacao_id ? 'Excluindo…' : 'Excluir'}
                      </button>
                      <button onClick={() => imprimirLaudo(a.avaliacao_id)}
                        disabled={imprimindo === a.avaliacao_id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium lift"
                        style={{ border: '1px solid var(--hair)', color: 'var(--ink)', opacity: imprimindo === a.avaliacao_id ? 0.6 : 1 }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--hair)'; }}>
                        {imprimindo === a.avaliacao_id ? 'Gerando…' : <>{Icon.print} Imprimir laudo PDF</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-7 py-5"
          style={{ borderTop: '1px solid var(--hair-soft)' }}>
          <div className="flex items-center gap-2">
            <BtnGhost onClick={arquivarToggle}>
              {arquivando ? '…' : (paciente.ativo ? 'Arquivar' : 'Reativar')}
            </BtnGhost>
            <button onClick={abrirExcluir}
              className="px-4 py-2.5 rounded-2xl text-[13px] font-medium lift"
              style={{ border: '1px solid var(--hair)', color: 'var(--rust)', background: 'transparent' }}>
              Excluir
            </button>
          </div>
          <div className="flex items-center gap-2">
            <BtnGhost onClick={onClose}>Fechar</BtnGhost>
            <BtnPrimary onClick={() => detalhe && onEditar && onEditar(detalhe)} disabled={!detalhe}>
              {Icon.edit} Editar
            </BtnPrimary>
          </div>
        </div>
      </div>

      {editandoAcomp && (
        <ModalEditarAcompanhante
          acompanhante={editandoAcomp}
          onClose={() => setEditandoAcomp(null)}
          onSalvo={() => { setEditandoAcomp(null); recarregarDetalhe(); }}
        />
      )}

      {excluindo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 anim-fade-in"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && fecharExcluir()}>
          <div className="w-full max-w-md rounded-3xl card-shadow anim-fade-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--hair)' }}>
            <div className="px-7 pt-7 pb-5" style={{ borderBottom: '1px solid var(--hair-soft)' }}>
              <h2 className="font-display text-[22px] leading-none">Excluir paciente</h2>
              <p className="text-[12.5px] mt-2" style={{ color: 'var(--muted)' }}>
                Esta ação é <strong>permanente</strong>. <strong>{paciente.nome}</strong> e
                {' '}<strong>todas as triagens e agendamentos</strong> vinculados serão apagados.
                Para confirmar, digite a <strong>sua</strong> senha.
              </p>
            </div>
            <div className="px-7 py-6">
              <Field label="Sua senha" required>
                <input className={`${inputCls} focus-ink`} style={inputStyle} type="password"
                  placeholder="Senha" value={senhaDel} autoFocus
                  onChange={(e) => { setSenhaDel(e.target.value); if (erroDel) setErroDel(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmarExcluir(); }} />
              </Field>
              {erroDel && <p className="text-[12.5px] mt-3" style={{ color: 'var(--rust)' }}>{erroDel}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 px-7 py-5"
              style={{ borderTop: '1px solid var(--hair-soft)' }}>
              <BtnGhost onClick={fecharExcluir}>Cancelar</BtnGhost>
              <button onClick={confirmarExcluir} disabled={delLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[13px] font-medium lift"
                style={{ background: 'var(--rust)', color: 'var(--on-ink)', opacity: delLoading ? 0.6 : 1 }}>
                {delLoading ? 'Excluindo…' : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════
function PacientesPage({ usuario, abrirPacienteId }) {
  const isAdmin = usuario?.tipo === 'admin';
  const [q, setQ]               = useState('');
  const [modal, setModal]       = useState(false);
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [prontuario, setProntuario] = useState(null);
  const [editando, setEditando] = useState(null);
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [medicoF, setMedicoF]   = useState('');
  const [medicos, setMedicos]   = useState([]);

  useEffect(() => {
    if (!isAdmin) return;
    api.getUsuarios()
      .then((us) => setMedicos((us || []).filter((u) => u.ativo !== false)))
      .catch((err) => console.error('Erro ao carregar médicos:', err));
  }, [isAdmin]);

  useEffect(() => {
    if (!abrirPacienteId) return;
    api.getPacienteDetalhe(abrirPacienteId)
      .then((det) => {
        if (det) setProntuario({ id: det.id, nome: det.nome, sexo: det.sexo, ativo: true });
      })
      .catch((err) => console.error('Erro ao abrir prontuário:', err));
  }, [abrirPacienteId]);

  async function carregarPacientes(params) {
    setLoading(true);
    try {
      const extra = { incluir_inativos: mostrarArquivados };
      if (isAdmin && medicoF) extra.medico_id = medicoF;
      const data = await api.getPacientes({ ...params, ...extra });
      setPacientes((data.items || []).map(p => {
        const [y, m, d] = (p.data_nascimento || '').split('-');
        const score = p.ultimo_score != null ? Number(p.ultimo_score) : 0;
        return {
          id:    p.id,
          nome:  p.nome || '—',
          sexo:  p.sexo,
          medico: p.medico || '—',
          nasc:  d ? `${d}/${m}/${y}` : '—',
          cpf:   p.cpf_masked || '—',
          cel:   p.telefone || '—',
          ult:   p.ultima_avaliacao
            ? new Date(p.ultima_avaliacao + 'T00:00:00').toLocaleDateString('pt-BR')
            : '—',
          risco:  p.recomenda_exame ? 'encaminhar' : 'baixo',
          score,
          acomps: p.qtd_acompanhantes ?? 0,
          ativo:  p.ativo !== false,
        };
      }));
    } catch (err) {
      console.error('Erro ao carregar pacientes:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      const digits = q.replace(/\D/g, '');
      if (digits.length === 11)   carregarPacientes({ cpf: digits });
      else if (q.trim())          carregarPacientes({ nome: q.trim() });
      else                        carregarPacientes();
    }, 300);
    return () => clearTimeout(handle);
  }, [q, mostrarArquivados, medicoF]);

  async function handleSalvar({ paciente: p, acompanhantes, fotoBase64 }) {
    const a = acompanhantes[0];
    const body = {
      nome: p.nome,
      cpf: (p.cpf || '').replace(/\D/g, '') || null,
      data_nascimento: p.dataNasc,
      sexo: p.sexo,
      telefone: p.celular?.trim() || null,
      etnia: p.etnia || null,
      escolaridade: p.escolaridade || null,
      prematuro: p.prematuro,
      tem_diagnostico_autismo: p.tem_diagnostico_autismo,
      tem_diagnostico_tdah: p.tem_diagnostico_tdah,
      outras_comorbidades: p.outras_comorbidades?.trim() || null,
      medicamentos_uso: p.medicamentos_uso?.trim() || null,
      acompanhante: {
        nome: a.nome,
        relacao: a.relacao,
        telefone: a.telefone || null,
        email: a.email || null,
      },
    };

    try {
      const criado = await api.createPaciente(body);

      if (fotoBase64 && criado?.id) {
        await FotoStore.salvar(criado.id, fotoBase64);
      }
    } catch (err) {
      console.error('Erro ao salvar paciente:', err);
      alert('Não foi possível salvar o paciente: ' + (err.message || 'erro desconhecido'));
      return;
    }

    carregarPacientes();
  }

  function exportarCSV() {
    if (!pacientes.length) return;
    const headers = ['Nome', 'Nascimento', 'CPF', 'Celular', 'Acompanhante',
      'Último escore', 'Última avaliação', 'Status'];
    const linhas = pacientes.map((p) => [
      p.nome, p.nasc, p.cpf, p.cel,
      p.acomps ? 'Sim' : 'Não',
      p.score > 0 ? p.score.toFixed(2) : '',
      p.ult !== '—' ? p.ult : '',
      p.score > 0 ? (p.risco === 'encaminhar' ? 'Encaminhar' : 'Baixo risco') : 'Sem triagem',
    ]);
    const esc = (v) => {
      const s = String(v ?? '');
      return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = [headers, ...linhas].map((r) => r.map(esc).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pacientes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="anim-fade-in space-y-5">

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>{Icon.search}</span>
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou CPF…"
              className="w-full rounded-2xl pl-11 pr-4 py-3 text-[14px] outline-none focus-ink lift"
              style={inputStyle} />
          </div>
          {isAdmin && (
            <select value={medicoF} onChange={(e) => setMedicoF(e.target.value)}
              className={`${inputCls} focus-ink appearance-none`}
              style={{ ...inputStyle, width: 'auto', backgroundImage: selectArrow,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px' }}>
              <option value="">Todos os médicos</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          )}
          <BtnGhost onClick={() => setMostrarArquivados((v) => !v)}>
            {mostrarArquivados ? 'Ocultar arquivados' : 'Mostrar arquivados'}
          </BtnGhost>
          <BtnGhost onClick={exportarCSV}>{Icon.chevronDown} Exportar CSV</BtnGhost>
          <BtnPrimary onClick={() => setModal(true)}>{Icon.plus} Novo paciente</BtnPrimary>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        {loading && (
          <div className="px-6 py-8 text-center text-[13px]" style={{ color: 'var(--muted)' }}>
            Carregando pacientes…
          </div>
        )}
        {!loading && pacientes.length === 0 && (
          <div className="px-6 py-8 text-center text-[13px]" style={{ color: 'var(--muted)' }}>
            Nenhum paciente cadastrado.
          </div>
        )}
        {!loading && pacientes.length > 0 && (
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--paper-2)' }}>
                {['#', 'Paciente', ...(isAdmin ? ['Médico'] : []), 'Nascimento', 'CPF', 'Celular', 'Acomp.', 'Último escore', 'Status', 'Ações'].map((h, i) => (
                  <th key={i} className="px-5 py-3 text-left text-[10.5px] font-medium uppercase tracking-[0.14em]"
                    style={{ color: 'var(--muted)', borderBottom: '1px solid var(--hair-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pacientes.map((p, i) => (
                <tr key={i} className="lift"
                  style={{ borderBottom: i < pacientes.length - 1 ? '1px solid var(--hair-soft)' : 'none',
                    opacity: p.ativo ? 1 : 0.55 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  <td className="px-5 py-4 font-mono text-[12px]" style={{ color: 'var(--subtle)' }}>
                    {String(i + 1).padStart(3, '0')}
                  </td>
                  <td className="px-5 py-4 text-[13.5px] font-medium">
                    {p.nome}
                    {!p.ativo && (
                      <span className="text-[10px] ml-2 px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ background: 'var(--paper-2)', border: '1px solid var(--hair)', color: 'var(--subtle)' }}>
                        Arquivado
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-4 text-[12.5px]" style={{ color: 'var(--muted)' }}>{p.medico}</td>
                  )}
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
                    <button onClick={() => setProntuario(p)}
                      className="text-[12px] font-medium lift" style={{ color: 'var(--ink)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}>
                      Abrir →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {modal && (
        <ModalCadastroPaciente
          onClose={() => setModal(false)}
          onSalvar={handleSalvar}
        />
      )}

      {prontuario && (
        <ModalProntuario
          paciente={prontuario}
          onClose={() => setProntuario(null)}
          onChanged={() => { setProntuario(null); carregarPacientes(); }}
          onEditar={(det) => { setProntuario(null); setEditando(det); }}
        />
      )}

      {editando && (
        <ModalCadastroPaciente
          pacienteEdit={editando}
          onClose={() => setEditando(null)}
          onSalvarEdicao={async (body) => {
            await api.updatePaciente(editando.id, body);
            await carregarPacientes();
          }}
        />
      )}
    </div>
  );
}
