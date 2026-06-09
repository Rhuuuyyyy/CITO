// ═══════════════════════════════════════════════════════════════════════
// TRIAGEM — busca autocomplete + modal resultado + PDF profissional
// ═══════════════════════════════════════════════════════════════════════

function formatarData(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}
function fmtCpf(v) {
  return (v || '').replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function calcIdade(dataNasc) {
  if (!dataNasc) return '—';
  const [y, m, d] = dataNasc.split('-').map(Number);
  const hoje = new Date();
  let anos = hoje.getFullYear() - y;
  const meses = hoje.getMonth() + 1 - m;
  if (meses < 0 || (meses === 0 && hoje.getDate() < d)) anos--;
  return `${anos} anos`;
}

const SINTOMAS = [
  { id: "deficiencia_intelectual",    label: "Deficiência intelectual",      pesoM: 0.32, pesoF: 0.20 },
  { id: "face_alongada_orelhas",      label: "Face alongada / orelhas",      pesoM: 0.29, pesoF: 0.09 },
  { id: "macroorquidismo",            label: "Macroorquidismo",              pesoM: 0.26, pesoF: null  },
  { id: "hipermobilidade_articular",  label: "Hipermobilidade articular",    pesoM: 0.19, pesoF: 0.04 },
  { id: "dificuldades_aprendizagem",  label: "Dificuldades de aprendizagem", pesoM: 0.18, pesoF: 0.28 },
  { id: "deficit_atencao",            label: "Déficit de atenção",           pesoM: 0.17, pesoF: 0.12 },
  { id: "movimentos_repetitivos",     label: "Movimentos repetitivos",       pesoM: 0.17, pesoF: 0.05 },
  { id: "atraso_fala",                label: "Atraso na fala",               pesoM: 0.14, pesoF: 0.01 },
  { id: "hiperatividade",             label: "Hiperatividade",               pesoM: 0.12, pesoF: 0.04 },
  { id: "evita_contato_visual",       label: "Evita contato visual",         pesoM: 0.06, pesoF: 0.08 },
  { id: "evita_contato_fisico",       label: "Evita contato físico",         pesoM: 0.04, pesoF: 0.07 },
  { id: "agressividade",              label: "Agressividade",                pesoM: 0.01, pesoF: 0.02 },
];
const LIMIAR_M = 0.56;
const LIMIAR_F = 0.55;
const STEPS = ["Paciente", "Acompanhante", "Questionário", "Histórico", "Revisão"];

const HISTORICO_FAMILIAR = [
  { id: 'deficiencia_intelectual',   label: 'Deficiência intelectual' },
  { id: 'autismo_na_familia',        label: 'Autismo na família' },
  { id: 'epilepsia',                 label: 'Epilepsia' },
  { id: 'falencia_ovariana_precoce', label: 'Falência ovariana precoce' },
  { id: 'menopausa_precoce',         label: 'Menopausa precoce' },
  { id: 'infertilidade_masculina',   label: 'Infertilidade masculina' },
  { id: 'abortos_recorrentes',       label: 'Abortos recorrentes' },
  { id: 'tremor_ataxia_familiar',    label: 'Tremor / ataxia familiar (FXTAS)' },
];

const SINTOMA_DESCRICAO = {
  deficiencia_intelectual:   'Deficiência intelectual',
  face_alongada_orelhas:     'Face alongada / orelhas salientes',
  macroorquidismo:           'Macroorquidismo',
  hipermobilidade_articular: 'Hipermobilidade articular',
  dificuldades_aprendizagem: 'Dificuldades de aprendizagem',
  deficit_atencao:           'Déficit de atenção',
  movimentos_repetitivos:    'Movimentos repetitivos (estereotipias)',
  atraso_fala:               'Atraso na fala',
  hiperatividade:            'Hiperatividade',
  evita_contato_visual:      'Evita contato visual',
  evita_contato_fisico:      'Evita contato físico',
  agressividade:             'Agressividade',
};

// ── STEP INDICATOR ──────────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-medium lift"
                style={{
                  background: done ? 'var(--sage)' : active ? 'var(--ink)' : 'transparent',
                  border: done ? '1px solid var(--sage)' : active ? '1px solid var(--ink)' : '1px solid var(--hair)',
                  color: done || active ? 'var(--on-ink)' : 'var(--subtle)',
                }}>
                {done ? Icon.check : i + 1}
              </div>
              <span className="text-[10.5px] font-medium uppercase tracking-[0.12em] hidden sm:block"
                style={{ color: active ? 'var(--ink)' : done ? 'var(--sage)' : 'var(--subtle)' }}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-8 sm:w-16 h-px mx-1 sm:mx-2 mb-0 sm:mb-7"
                style={{ background: done ? 'var(--sage)' : 'var(--hair)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── AUTOCOMPLETE DE BUSCA ────────────────────────────────────────────
function SearchAutocomplete({ placeholder, items, value, onSelect, onClear, displayKey = 'label', error }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen]   = useState(false);

  const filtered = query.length >= 1
    ? items.filter(i => (i[displayKey] || '').toLowerCase().includes(query.toLowerCase()))
    : items;

  function select(item) {
    setQuery(item[displayKey]);
    setOpen(false);
    onSelect(item);
  }

  function clear() {
    setQuery('');
    setOpen(false);
    onClear();
  }

  return (
    <div className="relative">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>{Icon.search}</span>
        <input
          className={`${inputCls} pl-11 pr-10 focus-ink`}
          style={inputStyle}
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); onClear(); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
        />
        {query && (
          <button onClick={clear}
            className="absolute right-4 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--subtle)' }}>
            {Icon.x}
          </button>
        )}
      </div>
      {error && <p className="text-[12px] mt-1.5" style={{ color: 'var(--rust)' }}>{error}</p>}
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-2xl overflow-hidden z-50 card-shadow"
          style={{ background: 'var(--surface)', border: '1px solid var(--hair)' }}>
          {filtered.slice(0, 8).map((item, i) => (
            <button key={i}
              onMouseDown={() => select(item)}
              className="w-full text-left px-4 py-3 text-[13.5px] lift flex items-center justify-between"
              style={{ borderBottom: i < Math.min(filtered.length, 8) - 1 ? '1px solid var(--hair-soft)' : 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ color: 'var(--ink)' }}>{item[displayKey]}</span>
              {item.sub && <span className="text-[11.5px] font-mono" style={{ color: 'var(--muted)' }}>{item.sub}</span>}
            </button>
          ))}
        </div>
      )}
      {open && query.length >= 1 && filtered.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-2xl px-4 py-3 z-50 card-shadow"
          style={{ background: 'var(--surface)', border: '1px solid var(--hair)' }}>
          <span className="text-[13px]" style={{ color: 'var(--muted)' }}>Nenhum resultado encontrado.</span>
        </div>
      )}
    </div>
  );
}

// ── MODAL DE RESULTADO ───────────────────────────────────────────────
function ModalResultado({ score, limiar, paciente, encaminhar, onDownload, onFechar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-lg rounded-3xl card-shadow anim-fade-up overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--hair)' }}>

        {/* Faixa de resultado */}
        <div className="px-8 pt-8 pb-6 text-center relative overflow-hidden"
          style={{ background: 'var(--ink)' }}>
          <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center"
            style={{ opacity: 0.06 }}>
            <img src="assets/cito-tight.png" alt="" className="cito-logo-img on-ink w-64" />
          </div>
          <div className="relative">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: encaminhar ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
              {encaminhar
                ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              }
            </div>
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-2"
              style={{ color: 'rgba(255,255,255,0.5)' }}>Resultado da triagem</div>
            <h2 className="font-display text-[28px] leading-tight" style={{ color: 'white' }}>
              {encaminhar ? 'Encaminhar para\nteste genético' : 'Baixo risco —\nacompanhamento'}
            </h2>
            <p className="text-[13px] mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {paciente.nome} · {paciente.sexo === 'M' ? 'Masculino' : 'Feminino'}
            </p>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10.5px] font-mono uppercase tracking-[0.16em] mb-1"
                style={{ color: 'var(--muted)' }}>Score calculado</div>
              <div className="font-display text-[52px] leading-none num-tabular"
                style={{ color: 'var(--ink)' }}>{score.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10.5px] font-mono uppercase tracking-[0.16em] mb-1"
                style={{ color: 'var(--muted)' }}>Limiar ({paciente.sexo === 'M' ? '♂' : '♀'})</div>
              <div className="font-display text-[52px] leading-none num-tabular"
                style={{ color: 'var(--subtle)' }}>{limiar}</div>
            </div>
          </div>

          {/* Barra de score */}
          <div className="h-2.5 rounded-full overflow-hidden mb-1"
            style={{ background: 'var(--hair-soft)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min((score / 1) * 100, 100)}%`,
                background: encaminhar ? 'var(--ink)' : 'var(--muted)',
              }} />
          </div>
          <div className="flex justify-between text-[10.5px] font-mono" style={{ color: 'var(--subtle)' }}>
            <span>0</span>
            <span style={{ color: 'var(--ink)' }}>limiar {limiar}</span>
            <span>1</span>
          </div>

          <p className="text-[12.5px] mt-5 leading-relaxed" style={{ color: 'var(--muted)' }}>
            {encaminhar
              ? 'Score igual ou acima do limiar validado. Recomenda-se encaminhamento para confirmação genética do gene FMR1.'
              : 'Score abaixo do limiar. Recomenda-se acompanhamento clínico e reavaliação periódica se novos sintomas surgirem.'}
          </p>
        </div>

        {/* Ações */}
        <div className="px-8 pb-8 flex flex-col sm:flex-row gap-3">
          <button onClick={onDownload}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 rounded-full text-[13.5px] font-medium lift"
            style={{ background: 'var(--ink)', color: 'var(--on-ink)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ink-2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--ink)'}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Baixar laudo PDF
          </button>
          <button onClick={onFechar}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 rounded-full text-[13.5px] font-medium lift"
            style={{ border: '1px solid var(--hair)', color: 'var(--ink-2)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-tint)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            Fechar e voltar
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════
function TriagemPage({ onNav, usuario }) {
  const [step, setStep]         = useState(0);
  const [errors, setErrors]     = useState({});
  const [salvando, setSalvando] = useState(false);
  const [modalResultado, setModalResultado] = useState(false);

  const [paciente, setPaciente] = useState({ nome: '', dataNasc: '', sexo: '', cpf: '' });
  const [acomp, setAcomp]       = useState({ nome: '', relacao: '', telefone: '', email: '' });
  const [respostas, setRespostas] = useState(Object.fromEntries(SINTOMAS.map((s) => [s.id, null])));
  const [sintomaIdMap, setSintomaIdMap] = useState({});
  const [historico, setHistorico] = useState({
    ...Object.fromEntries(HISTORICO_FAMILIAR.map((h) => [h.id, false])),
    descricao_outros: '',
  });

  const [modoPaciente, setModoPaciente] = useState('existente');
  const [pacienteId, setPacienteId]     = useState(null);
  const [pacientesDb, setPacientesDb]   = useState([]);
  const [acompsDb, setAcompsDb]         = useState([]);

  // Carrega pacientes e sintomas do backend
  useEffect(() => {
    api.getSintomas().then((data) => {
      const map = {};
      (data || []).forEach(s => {
        const key = Object.keys(SINTOMA_DESCRICAO).find(k => SINTOMA_DESCRICAO[k] === s.descricao);
        if (key) map[key] = s.id;
      });
      setSintomaIdMap(map);
    }).catch((err) => console.error('Erro ao carregar sintomas:', err));

    api.getPacientes({ limit: 200 }).then((data) => {
      setPacientesDb(data.items || []);
    }).catch((err) => console.error('Erro ao carregar pacientes:', err));
  }, []);

  // Itens para autocomplete de paciente (nome já vem mascarado da API)
  const pacientesItems = pacientesDb.map(p => ({
    id: p.id,
    label: p.nome,
    sub: p.data_nascimento ? formatarData(p.data_nascimento) : '',
    raw: p,
  }));

  // Itens para autocomplete de acompanhante (filtrado pelo paciente selecionado)
  const acompsItems = acompsDb.map(a => ({
    id: a.id,
    label: a.nome || '',
    sub: a.relacao || '',
    raw: a,
  }));

  function selecionarPaciente(item) {
    const p = item.raw;
    setPacienteId(p.id);
    setPaciente({
      nome: p.nome || '',
      dataNasc: p.data_nascimento || '',
      sexo: p.sexo || '',
      cpf: '',
    });
    // A API não expõe a lista de acompanhantes do paciente — apenas o telefone
    // do acompanhante aparece no item da lista. O acompanhante só é persistido
    // no cadastro de paciente novo; em avaliações de paciente já existente ele
    // não é reenviado, então a busca de acompanhante fica indisponível aqui.
    setAcompsDb([]);
    setAcomp({ nome: '', relacao: '', telefone: p.telefone || '', email: '' });
    setErrors({});
  }

  function selecionarAcomp(item) {
    const a = item.raw;
    setAcomp({
      nome: a.nome || '',
      relacao: a.relacao || '',
      telefone: a.telefone || '',
      email: a.email || '',
    });
    setErrors({});
  }

  function limparPaciente() {
    setPacienteId(null);
    setPaciente({ nome: '', dataNasc: '', sexo: '', cpf: '' });
    setAcomp({ nome: '', relacao: '', telefone: '', email: '' });
    setAcompsDb([]);
    setErrors({});
  }

  // ── Score ──
  const sintomasFiltrados = SINTOMAS.filter((s) => paciente.sexo === 'F' ? s.pesoF !== null : true);
  const calcScore = () => {
    const isM = paciente.sexo === 'M';
    let score = 0;
    sintomasFiltrados.forEach((s) => {
      const r = respostas[s.id];
      const p = isM ? s.pesoM : s.pesoF;
      if (r === 1 && p) score += p;
    });
    return parseFloat(score.toFixed(4));
  };
  const limiar = () => paciente.sexo === 'M' ? LIMIAR_M : LIMIAR_F;

  // ── Validação ──
  function validar(s) {
    const e = {};
    if (s === 0) {
      if (modoPaciente === 'existente' && !pacienteId)
        e.selecao = 'Selecione um paciente cadastrado ou troque para "Novo paciente".';
      if (modoPaciente === 'novo') {
        if (!paciente.nome.trim()) e.nome = 'Nome é obrigatório.';
        if (!paciente.dataNasc)    e.dataNasc = 'Data é obrigatória.';
        if (!paciente.sexo)        e.sexo = 'Sexo é obrigatório.';
        if ((paciente.cpf || '').replace(/\D/g, '').length !== 11) e.cpf = 'CPF deve ter 11 dígitos.';
      }
    }
    if (s === 1 && modoPaciente === 'novo') {
      // Acompanhante só é persistido ao cadastrar um paciente NOVO.
      if (!acomp.nome.trim())    e.nomeAcomp    = 'Nome é obrigatório.';
      if (!acomp.relacao.trim()) e.relacaoAcomp = 'Relação é obrigatória.';
    }
    if (s === 2) {
      const np = sintomasFiltrados.filter((x) => respostas[x.id] === null);
      if (np.length > 0) e.questionario = `${np.length} pergunta(s) não respondida(s).`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function avancar() {
    if (validar(step)) { setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }
  function voltar() { setErrors({}); setStep(step - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function setResposta(id, v) {
    setRespostas((p) => ({ ...p, [id]: v }));
    if (errors.questionario) setErrors({});
  }

  const respondidas = sintomasFiltrados.filter((s) => respostas[s.id] !== null).length;
  const progresso   = sintomasFiltrados.length ? Math.round((respondidas / sintomasFiltrados.length) * 100) : 0;

  // ── Salvar triagem ──
  async function salvarTriagem() {
    if (!usuario?.id || !usuario?.sessao_id) return false;
    setSalvando(true);
    try {
      let idPaciente = pacienteId;

      // Paciente novo: cadastra (com acompanhante) antes de submeter a avaliação.
      if (!idPaciente) {
        const novo = await api.createPaciente({
          nome: paciente.nome,
          cpf: (paciente.cpf || '').replace(/\D/g, '') || null,
          data_nascimento: paciente.dataNasc,
          sexo: paciente.sexo,
          acompanhante: {
            nome: acomp.nome,
            relacao: acomp.relacao,
            telefone: acomp.telefone || null,
            email: acomp.email || null,
          },
        });
        idPaciente = novo.id;
      }

      const respostasArr = sintomasFiltrados
        .map(s => ({ sintoma_id: sintomaIdMap[s.id], presente: respostas[s.id] === 1 }))
        .filter(r => r.sintoma_id);

      if (respostasArr.length === 0) {
        alert('Não foi possível mapear os sintomas para o catálogo do servidor. '
          + 'Verifique se a tabela de sintomas foi carregada.');
        return false;
      }

      // O backend calcula o score, aplica o limiar, cria o encaminhamento quando
      // indicado e registra a auditoria — tudo numa única chamada.
      await api.createAvaliacao({
        paciente_id: idPaciente,
        sessao_id: usuario.sessao_id,
        observacoes: '',
        diagnostico_previo_fxs: false,
        respostas: respostasArr,
        historico_familiar: {
          ...Object.fromEntries(HISTORICO_FAMILIAR.map(h => [h.id, !!historico[h.id]])),
          descricao_outros: historico.descricao_outros.trim() || null,
        },
      });

      return true;
    } catch (err) {
      console.error('Erro ao salvar triagem:', err);
      alert('Não foi possível salvar a triagem: ' + (err.message || 'erro desconhecido'));
      return false;
    } finally {
      setSalvando(false);
    }
  }

  // ── PDF profissional ──
  async function carregarImagem(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = reject;
    img.src = src;
  });}
  async function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const score      = calcScore();
    const encaminhar = score >= limiar();
    const resultado  = encaminhar ? 'Encaminhar para teste genético (FMR1)' : 'Baixo risco — acompanhamento clínico';
    const W = 210, ML = 20, MR = 20, CW = W - ML - MR;
    let y = 0;

    // ── Cabeçalho institucional ──
    doc.setFillColor(13, 33, 55); // #0D2137 azul petróleo
    doc.rect(0, 0, W, 42, 'F');
    doc.setTextColor(255, 255, 255);
    try {const logo = await carregarImagem('assets/cito-logo.png');
    doc.addImage(logo,'PNG',ML,6,28,28);} 
    catch (e) {console.log('Erro logo:', e);}
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 200, 220);
    doc.text('Ferramenta de Pré-diagnóstico — Síndrome do X Frágil', ML + 32, 22);
    doc.text('Sistema CITO · SUS · CAAE 47291 · LGPD compliant', ML + 32, 28);
    doc.setFontSize(8);
    doc.setTextColor(120, 160, 200);
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`,ML + 32,34);

    // Linha de título do documento (lado direito)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('LAUDO DE TRIAGEM SXF', W - MR, 18, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 200, 220);
    doc.text(`Score: ${score.toFixed(2)} · Limiar: ${limiar()}`, W - MR, 25, { align: 'right' });

    y = 52;

    // ── Faixa de resultado ──
    const resColor = encaminhar ? [13, 33, 55] : [40, 80, 60];
    doc.setFillColor(...resColor);
    doc.roundedRect(ML, y, CW, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(resultado.toUpperCase(), ML + CW / 2, y + 11, { align: 'center' });
    y += 26;

    // ── Seção dados do paciente ──
    function secHeader(titulo) {
      doc.setFillColor(235, 240, 248);
      doc.rect(ML, y, CW, 8, 'F');
      doc.setTextColor(13, 33, 55);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(titulo.toUpperCase(), ML + 3, y + 5.5);
      y += 12;
    }

    function campo(label, valor, x2col = false) {
      doc.setTextColor(100, 110, 125);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(label, ML, y);
      doc.setTextColor(20, 30, 50);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(String(valor || '—'), ML, y + 5);
      y += 12;
    }

    function campoGrid(pares) {
      const colW = CW / pares.length;
      pares.forEach(([label, valor], i) => {
        const x = ML + i * colW;
        doc.setTextColor(100, 110, 125);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(label, x, y);
        doc.setTextColor(20, 30, 50);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(String(valor || '—'), x, y + 5);
      });
      y += 13;
    }

    secHeader('Dados do paciente');
    campoGrid([['Nome completo', paciente.nome], ['Sexo biológico', paciente.sexo === 'M' ? 'Masculino' : 'Feminino']]);
    campoGrid([['Data de nascimento', formatarData(paciente.dataNasc)], ['Idade', calcIdade(paciente.dataNasc)]]);

    y += 2;
    secHeader('Dados do acompanhante');
    campoGrid([['Nome', acomp.nome], ['Relação com o paciente', acomp.relacao]]);
    if (acomp.telefone || acomp.email)
      campoGrid([['Telefone', acomp.telefone || '—'], ['E-mail', acomp.email || '—']]);

    y += 2;
    secHeader('Resultado do escore');

    // Barra de score visual
    doc.setFillColor(220, 228, 240);
    doc.roundedRect(ML, y, CW, 6, 2, 2, 'F');
    const barW = Math.min((score / 1) * CW, CW);
    doc.setFillColor(13, 33, 55);
    doc.roundedRect(ML, y, barW, 6, 2, 2, 'F');
    // marcador de limiar
    const limiarX = ML + limiar() * CW;
    doc.setDrawColor(200, 80, 80);
    doc.setLineWidth(0.4);
    doc.line(limiarX, y - 1, limiarX, y + 7);
    doc.setFontSize(7);
    doc.setTextColor(200, 80, 80);
    doc.text(`limiar ${limiar()}`, limiarX + 1, y - 2);
    y += 10;

    campoGrid([
      ['Score calculado', score.toFixed(4)],
      ['Limiar de corte', limiar()],
      ['Diferença', (score - limiar()).toFixed(4)],
    ]);

    doc.setFillColor(encaminhar ? 255 : 245, encaminhar ? 245 : 255, encaminhar ? 235 : 245);
    doc.roundedRect(ML, y, CW, 10, 2, 2, 'F');
    doc.setTextColor(encaminhar ? 120 : 40, encaminhar ? 80 : 100, encaminhar ? 20 : 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(resultado, ML + CW / 2, y + 6.5, { align: 'center' });
    y += 18;

    secHeader('Sintomas avaliados');
    const presentes = sintomasFiltrados.filter(s => respostas[s.id] === 1);
    const ausentes  = sintomasFiltrados.filter(s => respostas[s.id] !== 1);

    // Duas colunas: presentes | ausentes
    const colA = ML, colB = ML + CW / 2 + 2;
    const yBase = y;
    let yA = y, yB = y;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 33, 55);
    doc.text('PRESENTES', colA, yA); yA += 5;
    doc.text('AUSENTES', colB, yB); yB += 5;

    presentes.forEach(s => {
      if (yA > 275) { doc.addPage(); yA = 20; yB = 20; }
      doc.setFillColor(13, 33, 55);
      doc.circle(colA + 2, yA - 1.5, 1.2, 'F');
      doc.setTextColor(20, 30, 50);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(s.label, colA + 6, yA);
      const peso = paciente.sexo === 'M' ? s.pesoM : s.pesoF;
      doc.setTextColor(100, 110, 130);
      doc.setFontSize(7.5);
      doc.text(`(${peso?.toFixed(2)})`, colA + CW / 2 - 4, yA, { align: 'right' });
      yA += 7;
    });

    ausentes.forEach(s => {
      if (yB > 275) { doc.addPage(); yB = 20; }
      doc.setFillColor(180, 190, 200);
      doc.circle(colB + 2, yB - 1.5, 1.2, 'F');
      doc.setTextColor(130, 140, 155);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(s.label, colB + 6, yB);
      yB += 7;
    });

    y = Math.max(yA, yB) + 6;

    // ── Histórico familiar ──
    const histMarcados = HISTORICO_FAMILIAR.filter(h => historico[h.id]);
    if (histMarcados.length > 0 || historico.descricao_outros.trim()) {
      if (y > 240) { doc.addPage(); y = 20; }
      secHeader('Histórico familiar');
      histMarcados.forEach(h => {
        doc.setFillColor(13, 33, 55);
        doc.circle(ML + 2, y - 1.5, 1.2, 'F');
        doc.setTextColor(20, 30, 50);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(h.label, ML + 6, y);
        y += 7;
      });
      if (historico.descricao_outros.trim()) {
        doc.setTextColor(80, 90, 100);
        doc.setFontSize(8);
        doc.text(`Outros: ${historico.descricao_outros.trim()}`, ML, y);
        y += 7;
      }
    }

    // ── Rodapé ──
    const totalPages = doc.getNumberOfPages();
    for (let pg = 1; pg <= totalPages; pg++) {
      doc.setPage(pg);
      doc.setDrawColor(200, 210, 225);
      doc.setLineWidth(0.3);
      doc.line(ML, 285, W - MR, 285);
      doc.setTextColor(150, 160, 175);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('CITO · Síndrome do X Frágil · Este laudo não substitui avaliação médica especializada.', ML, 290);
      doc.text(`Página ${pg} de ${totalPages}`, W - MR, 290, { align: 'right' });
    }

    doc.save(`triagem-${(paciente.nome || 'paciente').replaceAll(' ', '_')}-${new Date().toISOString().slice(0,10)}.pdf`);
  }

  // ── RENDER ──────────────────────────────────────────────────────────
  return (
    <div className="anim-fade-in max-w-3xl mx-auto pb-12">

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
          style={{ background: 'var(--hover-tint)', color: 'var(--ink)' }}>
          <span>{Icon.cat}</span>
          <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Pré-diagnóstico — Síndrome do X Frágil</span>
        </div>
        <h1 className="font-display leading-[1.05]" style={{ fontSize: 'clamp(28px, 5vw, 44px)' }}>
          Triagem — Síndrome do X Frágil
        </h1>
        <p className="text-[13.5px] mt-3 max-w-xl mx-auto" style={{ color: 'var(--muted)' }}>
          Modelo estatístico validado — AUC 0,73 (♂) e 0,76 (♀).
        </p>
      </div>

      <StepIndicator current={step} />

      {/* ── STEP 0 — PACIENTE ── */}
      {step === 0 && (
        <Card className="p-6 sm:p-8">
          <h2 className="font-display text-[26px] leading-none mb-1">Dados do paciente</h2>
          <p className="text-[13px] mb-6" style={{ color: 'var(--muted)' }}>
            Busque um paciente cadastrado ou cadastre um novo.
          </p>

          {/* Toggle modo */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {[['existente', 'Buscar cadastrado'], ['novo', 'Novo paciente']].map(([v, lab]) => (
              <button key={v} type="button"
                onClick={() => { setModoPaciente(v); limparPaciente(); }}
                className="py-3 rounded-2xl text-[13px] font-medium lift"
                style={{
                  background: modoPaciente === v ? 'var(--ink)' : 'var(--surface)',
                  color: modoPaciente === v ? 'var(--on-ink)' : 'var(--ink-2)',
                  border: modoPaciente === v ? '1px solid var(--ink)' : '1px solid var(--hair)',
                }}>{lab}</button>
            ))}
          </div>

          {/* BUSCA */}
          {modoPaciente === 'existente' && (
            <>
              <Field label="Buscar paciente" required>
                <SearchAutocomplete
                  placeholder="Digite o nome do paciente…"
                  items={pacientesItems}
                  value=""
                  onSelect={selecionarPaciente}
                  onClear={limparPaciente}
                  error={errors.selecao}
                />
              </Field>

              {pacienteId && (
                <div className="mt-4 rounded-2xl px-5 py-4"
                  style={{ background: 'var(--paper-2)', border: '1px solid var(--hair-soft)' }}>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
                    <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Nome</span><p>{paciente.nome}</p></div>
                    <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Sexo</span><p>{paciente.sexo === 'M' ? 'Masculino' : 'Feminino'}</p></div>
                    <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Nascimento</span><p className="font-mono">{formatarData(paciente.dataNasc)}</p></div>
                    <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Idade</span><p>{calcIdade(paciente.dataNasc)}</p></div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* NOVO PACIENTE */}
          {modoPaciente === 'novo' && (
            <>
              <Field label="Nome completo" required error={errors.nome}>
                <input className={inputCls} style={inputStyle} type="text" placeholder="Nome do paciente"
                  value={paciente.nome} onChange={(e) => setPaciente({ ...paciente, nome: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Data de nascimento" required error={errors.dataNasc}>
                  <input className={inputCls} style={inputStyle} type="date"
                    value={paciente.dataNasc} onChange={(e) => setPaciente({ ...paciente, dataNasc: e.target.value })} />
                </Field>
                <Field label="Sexo biológico" required error={errors.sexo}>
                  <div className="grid grid-cols-2 gap-2">
                    {[['M','Masculino'], ['F','Feminino']].map(([v, lab]) => (
                      <button key={v} onClick={() => setPaciente({ ...paciente, sexo: v })}
                        className="py-3 rounded-2xl text-[13px] font-medium lift"
                        style={{
                          background: paciente.sexo === v ? 'var(--ink)' : 'var(--surface)',
                          color: paciente.sexo === v ? 'var(--on-ink)' : 'var(--ink-2)',
                          border: paciente.sexo === v ? '1px solid var(--ink)' : '1px solid var(--hair)',
                        }}>{lab}</button>
                    ))}
                  </div>
                </Field>
              </div>
              <Field label="CPF" required error={errors.cpf}>
                <input className={`${inputCls} font-mono`} style={inputStyle} type="text" placeholder="000.000.000-00"
                  value={paciente.cpf || ''} onChange={(e) => setPaciente({ ...paciente, cpf: fmtCpf(e.target.value) })} />
              </Field>
            </>
          )}
        </Card>
      )}

      {/* ── STEP 1 — ACOMPANHANTE ── */}
      {step === 1 && (
        <Card className="p-6 sm:p-8">
          <h2 className="font-display text-[26px] leading-none mb-1">Dados do acompanhante</h2>
          <p className="text-[13px] mb-6" style={{ color: 'var(--muted)' }}>
            Busque um acompanhante já vinculado a este paciente ou informe um novo.
          </p>

          {/* Busca de acompanhante se houver cadastrados */}
          {acompsDb.length > 0 && (
            <div className="mb-5">
              <Field label="Buscar acompanhante cadastrado">
                <SearchAutocomplete
                  placeholder="Digite o nome do acompanhante…"
                  items={acompsItems}
                  value=""
                  onSelect={selecionarAcomp}
                  onClear={() => setAcomp({ nome: '', relacao: '', telefone: '', email: '' })}
                />
              </Field>
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px" style={{ background: 'var(--hair)' }} />
                <span className="text-[11.5px]" style={{ color: 'var(--subtle)' }}>ou informe manualmente</span>
                <div className="flex-1 h-px" style={{ background: 'var(--hair)' }} />
              </div>
            </div>
          )}

          <Field label="Nome completo" required error={errors.nomeAcomp}>
            <input className={inputCls} style={inputStyle} type="text" placeholder="Nome do acompanhante"
              value={acomp.nome} onChange={(e) => setAcomp({ ...acomp, nome: e.target.value })} />
          </Field>

          <Field label="Relação com o paciente" required error={errors.relacaoAcomp}>
            <div className="flex flex-wrap gap-2">
              {['Mãe','Pai','Avó / Avô','Tio / Tia','Irmão / Irmã','Cuidador(a)','Outro'].map(r => (
                <button key={r} onClick={() => setAcomp({ ...acomp, relacao: r })}
                  className="px-3 py-1.5 rounded-full text-[12.5px] font-medium lift"
                  style={{
                    background: acomp.relacao === r ? 'var(--ink)' : 'var(--surface)',
                    color: acomp.relacao === r ? 'var(--on-ink)' : 'var(--ink-2)',
                    border: acomp.relacao === r ? '1px solid var(--ink)' : '1px solid var(--hair)',
                  }}>{r}</button>
              ))}
            </div>
            {errors.relacaoAcomp && <p className="text-[12px] mt-1.5" style={{ color: 'var(--rust)' }}>{errors.relacaoAcomp}</p>}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Telefone">
              <input className={inputCls} style={inputStyle} type="tel" placeholder="(00) 9 0000-0000"
                value={acomp.telefone} onChange={(e) => setAcomp({ ...acomp, telefone: e.target.value })} />
            </Field>
            <Field label="E-mail">
              <input className={inputCls} style={inputStyle} type="email" placeholder="email@exemplo.com"
                value={acomp.email} onChange={(e) => setAcomp({ ...acomp, email: e.target.value })} />
            </Field>
          </div>

          {/* Resumo paciente */}
          <div className="mt-4 rounded-2xl px-5 py-4 flex items-center gap-3"
            style={{ background: 'var(--paper-2)', border: '1px solid var(--hair-soft)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold"
              style={{ background: 'var(--ink)', color: 'var(--on-ink)' }}>
              {paciente.sexo || '?'}
            </div>
            <div className="text-[12.5px]" style={{ color: 'var(--ink-2)' }}>
              <span className="font-medium">{paciente.nome || '—'}</span>
              {paciente.dataNasc && <> · {calcIdade(paciente.dataNasc)}</>}
              {paciente.dataNasc && <> · nasc. {formatarData(paciente.dataNasc)}</>}
            </div>
          </div>
        </Card>
      )}

      {/* ── STEP 2 — QUESTIONÁRIO ── */}
      {step === 2 && (
        <div>
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink-2)' }}>
                {respondidas} de {sintomasFiltrados.length} respondidas
              </span>
              <span className="text-[12.5px] font-mono num-tabular" style={{ color: 'var(--muted)' }}>{progresso}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--hair-soft)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progresso}%`, background: 'var(--ink)' }} />
            </div>
          </div>

          {errors.questionario && (
            <div className="rounded-2xl px-4 py-3 mb-4 text-[12.5px]"
              style={{ background: 'var(--rust-soft)', color: 'var(--rust)' }}>
              {errors.questionario}
            </div>
          )}

          <Card className="overflow-hidden">
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--hair-soft)', background: 'var(--paper-2)' }}>
              <p className="text-[12.5px]" style={{ color: 'var(--ink-2)' }}>
                Responda com base no comportamento habitual de{' '}
                <span className="font-medium" style={{ color: 'var(--ink)' }}>{paciente.nome || '—'}</span>.
                Acompanhante: <span className="font-medium" style={{ color: 'var(--ink)' }}>{acomp.nome || '—'}</span>.
              </p>
            </div>
            <div>
              {sintomasFiltrados.map((s, idx) => {
                const resp = respostas[s.id];
                const peso = paciente.sexo === 'M' ? s.pesoM : s.pesoF;
                return (
                  <div key={s.id} className="flex items-center justify-between px-5 py-4 lift"
                    style={{
                      borderBottom: idx < sintomasFiltrados.length - 1 ? '1px solid var(--hair-soft)' : 'none',
                      background: resp === 1 ? 'var(--hover-tint)' : 'transparent',
                    }}>
                    <div className="flex-1 pr-3">
                      <div className="flex items-baseline gap-3">
                        <span className="text-[11px] font-mono num-tabular w-5 flex-shrink-0" style={{ color: 'var(--subtle)' }}>
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="text-[13.5px]" style={{ color: 'var(--ink)' }}>{s.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setResposta(s.id, 0)}
                        className="px-3 sm:px-4 py-2.5 rounded-full text-[12px] font-medium lift min-w-[52px] sm:min-w-[64px]"
                        style={{
                          background: 'var(--surface)', border: resp === 0 ? '1px solid var(--ink)' : '1px solid var(--hair)',
                          color: resp === 0 ? 'var(--ink)' : 'var(--muted)',
                        }}>Não</button>
                      <button onClick={() => setResposta(s.id, 1)}
                        className="px-3 sm:px-4 py-2.5 rounded-full text-[12px] font-medium lift min-w-[52px] sm:min-w-[64px]"
                        style={{
                          background: resp === 1 ? 'var(--ink)' : 'var(--surface)',
                          color: resp === 1 ? 'var(--on-ink)' : 'var(--ink-2)',
                          border: resp === 1 ? '1px solid var(--ink)' : '1px solid var(--hair)',
                        }}>Sim</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── STEP 3 — HISTÓRICO FAMILIAR ── */}
      {step === 3 && (
        <Card className="p-6 sm:p-8">
          <h2 className="font-display text-[26px] leading-none mb-1">Histórico familiar</h2>
          <p className="text-[13px] mb-6" style={{ color: 'var(--muted)' }}>
            Marque as condições presentes na família. Todos os campos são opcionais.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {HISTORICO_FAMILIAR.map((h) => {
              const ativo = historico[h.id];
              return (
                <button key={h.id} type="button"
                  onClick={() => setHistorico((p) => ({ ...p, [h.id]: !p[h.id] }))}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left lift"
                  style={{
                    background: ativo ? 'var(--hover-tint)' : 'var(--surface)',
                    border: ativo ? '1px solid var(--ink)' : '1px solid var(--hair)',
                  }}>
                  <span className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: ativo ? 'var(--ink)' : 'transparent', border: ativo ? '1px solid var(--ink)' : '1px solid var(--hair)', color: 'var(--on-ink)' }}>
                    {ativo && Icon.check}
                  </span>
                  <span className="text-[13.5px]" style={{ color: 'var(--ink)' }}>{h.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-5">
            <Field label="Outras observações">
              <input className={inputCls} style={inputStyle} type="text"
                placeholder="Outras condições relevantes na família"
                value={historico.descricao_outros}
                onChange={(e) => setHistorico((p) => ({ ...p, descricao_outros: e.target.value }))} />
            </Field>
          </div>
        </Card>
      )}

      {/* ── STEP 4 — REVISÃO ── */}
      {step === 4 && (
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="text-[10.5px] font-medium uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--muted)' }}>Paciente</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
              <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Nome</span><p>{paciente.nome}</p></div>
              <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Sexo</span><p>{paciente.sexo === 'M' ? 'Masculino' : 'Feminino'}</p></div>
              <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Nascimento</span><p className="font-mono">{formatarData(paciente.dataNasc)}</p></div>
              <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Idade</span><p>{calcIdade(paciente.dataNasc)}</p></div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-[10.5px] font-medium uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--muted)' }}>Acompanhante</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
              <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Nome</span><p>{acomp.nome}</p></div>
              <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Relação</span><p>{acomp.relacao}</p></div>
              {acomp.telefone && <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Telefone</span><p className="font-mono">{acomp.telefone}</p></div>}
              {acomp.email    && <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>E-mail</span><p>{acomp.email}</p></div>}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-[10.5px] font-medium uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--muted)' }}>Sintomas avaliados</h3>
            <div>
              {sintomasFiltrados.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: i < sintomasFiltrados.length - 1 ? '1px solid var(--hair-soft)' : 'none' }}>
                  <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{s.label}</span>
                  <Pill tone={respostas[s.id] === 1 ? 'honey' : 'neutral'}>
                    {respostas[s.id] === 1 ? 'Presente' : 'Ausente'}
                  </Pill>
                </div>
              ))}
            </div>
          </Card>

          {HISTORICO_FAMILIAR.filter(h => historico[h.id]).length > 0 && (
            <Card className="p-6">
              <h3 className="text-[10.5px] font-medium uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--muted)' }}>Histórico familiar</h3>
              <div className="flex flex-wrap gap-2">
                {HISTORICO_FAMILIAR.filter(h => historico[h.id]).map(h => (
                  <Pill key={h.id} tone="honey">{h.label}</Pill>
                ))}
                {historico.descricao_outros.trim() && <Pill tone="neutral">{historico.descricao_outros.trim()}</Pill>}
              </div>
            </Card>
          )}

          {/* Score card */}
          <Card className="p-6 sm:p-8 relative overflow-hidden" style={{ background: 'var(--ink)' }}>
            <div className="absolute -bottom-6 -right-2 pointer-events-none" style={{ opacity: 0.12, width: 220 }}>
              <img src="assets/cito-tight.png" alt="" className="cito-logo-img on-ink w-full select-none" />
            </div>
            <div className="relative flex items-start justify-between gap-6 flex-wrap">
              <div>
                <div className="text-[10.5px] font-mono uppercase tracking-[0.16em] mb-2" style={{ color: 'var(--on-ink-55)' }}>Score calculado</div>
                <div className="font-display text-[64px] leading-none num-tabular" style={{ color: 'var(--on-ink)' }}>
                  {calcScore().toFixed(2)}
                </div>
                <div className="text-[12px] mt-2" style={{ color: 'var(--on-ink-55)' }}>
                  Limiar ({paciente.sexo === 'M' ? '♂' : '♀'}): {limiar()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10.5px] font-mono uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--on-ink-55)' }}>Resultado preliminar</div>
                {calcScore() >= limiar() ? (
                  <div className="inline-block px-5 py-2.5 rounded-full text-[13.5px] font-medium"
                    style={{ background: 'var(--on-ink)', color: 'var(--ink)' }}>
                    Encaminhar para teste genético
                  </div>
                ) : (
                  <div className="inline-block px-5 py-2.5 rounded-full text-[13.5px] font-medium"
                    style={{ background: 'transparent', color: 'var(--on-ink)', border: '1px solid var(--on-ink-35)' }}>
                    Baixo risco — acompanhamento
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── NAVEGAÇÃO ── */}
      <div className="flex items-center justify-between mt-8">
        <div>
          {step > 0 && <BtnGhost onClick={voltar}>{Icon.chevronLeft} Voltar</BtnGhost>}
          {step === 0 && <BtnGhost onClick={() => onNav('dashboard')}>{Icon.chevronLeft} Cancelar</BtnGhost>}
        </div>
        <div>
          {step < 4 && <BtnPrimary onClick={avancar}>Continuar {Icon.chevronRight}</BtnPrimary>}
          {step === 4 && (
            <BtnPrimary
              disabled={salvando}
              onClick={async () => {
                const ok = await salvarTriagem();
                if (ok !== false) setModalResultado(true);
              }}>
              {salvando ? 'Salvando…' : <>{Icon.check} Gerar laudo</>}
            </BtnPrimary>
          )}
        </div>
      </div>

      {/* ── MODAL DE RESULTADO ── */}
      {modalResultado && (
        <ModalResultado
          score={calcScore()}
          limiar={limiar()}
          paciente={paciente}
          encaminhar={calcScore() >= limiar()}
          onDownload={() => gerarPDF()}
          onFechar={() => { setModalResultado(false); onNav('dashboard'); }}
        />
      )}
    </div>
  );
}