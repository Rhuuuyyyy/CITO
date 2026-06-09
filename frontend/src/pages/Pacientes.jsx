// ═══════════════════════════════════════════════════════════════════════
// PACIENTES
// ═══════════════════════════════════════════════════════════════════════

// ── Acompanhante em branco ──
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

// ── Modal de cadastro ────────────────────────────────────────────────
function ModalCadastroPaciente({ onClose, onSalvar }) {
  const [aba, setAba]         = useState('paciente'); // 'paciente' | 'acompanhantes'
  const [errors, setErrors]   = useState({});
  const [paciente, setPac]    = useState({
    nome: '', dataNasc: '', sexo: '', cpf: '', celular: '', email: '',
    etnia: '', escolaridade: '', prematuro: false,
    tem_diagnostico_autismo: false, tem_diagnostico_tdah: false,
    outras_comorbidades: '', medicamentos_uso: '',
  });
  const [acomps, setAcomps]   = useState([acompVazio()]);

  // ── Validação ──
  function validarPaciente() {
    const e = {};
    if (!paciente.nome.trim())       e.nome       = 'Obrigatório.';
    if (!paciente.dataNasc)          e.dataNasc   = 'Obrigatório.';
    if (!paciente.sexo)              e.sexo       = 'Obrigatório.';
    if (!paciente.cpf.trim())        e.cpf        = 'Obrigatório.';
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
                    ['prematuro', 'Prematuro (<37 sem.)'],
                    ['tem_diagnostico_autismo', 'Diagnóstico de autismo'],
                    ['tem_diagnostico_tdah', 'Diagnóstico de TDAH'],
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

function ModalProntuario({ paciente, onClose }) {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHistorico(paciente.id)
      .then((data) => { setAvaliacoes(data.items || []); })
      .catch((err) => { console.error('Erro ao carregar prontuário:', err); })
      .finally(() => setLoading(false));
  }, [paciente.id]);

  const limiar = paciente.sexo === 'M' ? 0.56 : 0.55;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl card-shadow anim-fade-up"
        style={{ background: 'var(--surface)', border: '1px solid var(--hair)' }}>

        <div className="flex items-center justify-between px-7 pt-7 pb-5"
          style={{ borderBottom: '1px solid var(--hair-soft)' }}>
          <div>
            <h2 className="font-display text-[26px] leading-none">{paciente.nome}</h2>
            <p className="text-[12.5px] mt-1" style={{ color: 'var(--muted)' }}>
              Histórico de triagens · {paciente.sexo === 'M' ? 'Masculino' : 'Feminino'}
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

        <div className="flex-1 overflow-y-auto px-7 py-6">
          {loading && (
            <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Carregando…</p>
          )}
          {!loading && avaliacoes.length === 0 && (
            <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
              Nenhuma triagem registrada para este paciente.
            </p>
          )}

          <div className="space-y-3">
            {avaliacoes.map((a) => {
              const score = a.score_final != null ? Number(a.score_final) : null;
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
                  {encaminha && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Pill tone="honey">exame_fmr1 · auto</Pill>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end px-7 py-5"
          style={{ borderTop: '1px solid var(--hair-soft)' }}>
          <BtnGhost onClick={onClose}>Fechar</BtnGhost>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════
function PacientesPage({ usuario }) {
  const [q, setQ]             = useState('');
  const [modal, setModal]     = useState(false);
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prontuario, setProntuario] = useState(null);

  async function carregarPacientes(params) {
    setLoading(true);
    try {
      const data = await api.getPacientes(params);
      setPacientes((data.items || []).map(p => {
        const [y, m, d] = (p.data_nascimento || '').split('-');
        const score = p.ultimo_score != null ? Number(p.ultimo_score) : 0;
        return {
          id:     p.id,
          nome:   p.nome || '—',
          sexo:   p.sexo,
          nasc:   d ? `${d}/${m}/${y}` : '—',
          cpf:    p.cpf_masked || '—',
          cel:    p.telefone || '—',
          ult:    p.ultima_avaliacao
            ? new Date(p.ultima_avaliacao + 'T00:00:00').toLocaleDateString('pt-BR')
            : '—',
          risco:  p.recomenda_exame ? 'encaminhar' : 'baixo',
          score:  score,
          acomps: p.tem_acompanhante ? 1 : 0,
        };
      }));
    } catch (err) {
      console.error('Erro ao carregar pacientes:', err);
    } finally {
      setLoading(false);
    }
  }

  // Server-side search: names are masked in the API, so filtering must run on the backend.
  useEffect(() => {
    const handle = setTimeout(() => {
      const digits = q.replace(/\D/g, '');
      if (digits.length === 11) carregarPacientes({ cpf: digits });
      else if (q.trim()) carregarPacientes({ nome: q.trim() });
      else carregarPacientes();
    }, 300);
    return () => clearTimeout(handle);
  }, [q]);

  async function handleSalvar({ paciente: p, acompanhantes }) {
    const a = acompanhantes[0];

    const body = {
      nome: p.nome,
      cpf: (p.cpf || '').replace(/\D/g, '') || null,
      data_nascimento: p.dataNasc,
      sexo: p.sexo,
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
      await api.createPaciente(body);
    } catch (err) {
      console.error('Erro ao salvar paciente:', err);
      alert('Não foi possível salvar o paciente: ' + (err.message || 'erro desconhecido'));
      return;
    }

    carregarPacientes();
  }

  // Exporta a lista atual (já carregada/filtrada) como CSV. Client-side, sem backend.
  // Separador ';' + BOM para abrir bem no Excel em pt-BR. Dados já mascarados (LGPD).
  function exportarCSV() {
    if (!pacientes.length) return;
    const headers = ['Nome', 'Nascimento', 'CPF', 'Celular', 'Acompanhante',
      'Último escore', 'Última avaliação', 'Status'];
    const linhas = pacientes.map((p) => [
      p.nome,
      p.nasc,
      p.cpf,
      p.cel,
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
          <BtnGhost onClick={exportarCSV}>{Icon.chevronDown} Exportar CSV</BtnGhost>
          <BtnPrimary onClick={() => setModal(true)}>{Icon.plus} Novo paciente</BtnPrimary>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden">
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
        {!loading && pacientes.length > 0 && <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--paper-2)' }}>
              {['#','Paciente','Nascimento','CPF','Celular','Acomp.','Último escore','Status','Ações'].map((h, i) => (
                <th key={i} className="px-5 py-3 text-left text-[10.5px] font-medium uppercase tracking-[0.14em]"
                  style={{ color: 'var(--muted)', borderBottom: '1px solid var(--hair-soft)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pacientes.map((p, i) => (
              <tr key={i} className="lift"
                style={{ borderBottom: i < pacientes.length - 1 ? '1px solid var(--hair-soft)' : 'none' }}
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
        </table>}
      </Card>

      {/* Modal */}
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
        />
      )}
    </div>
  );
}