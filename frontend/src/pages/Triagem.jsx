// ═══════════════════════════════════════════════════════════════════════
// TRIAGEM
// ═══════════════════════════════════════════════════════════════════════
function formatarData(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
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
const STEPS = ["Paciente", "Acompanhante", "Questionário", "Revisão"];

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
              <span className="text-[10.5px] font-medium uppercase tracking-[0.12em]"
                style={{ color: active ? 'var(--ink)' : done ? 'var(--sage)' : 'var(--subtle)' }}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-16 h-px mx-2 mb-7"
                style={{ background: done ? 'var(--sage)' : 'var(--hair)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TriagemPage({ onNav }) {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [paciente, setPaciente] = useState({ nome: "", dataNasc: "", sexo: "", responsavel: "" });
  const [acomp, setAcomp] = useState({ nome: "", relacao: "", telefone: "", email: "" });
  const [respostas, setRespostas] = useState(Object.fromEntries(SINTOMAS.map((s) => [s.id, null])));

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

  function validar(s) {
    const e = {};
    if (s === 0) {
      if (!paciente.nome.trim()) e.nome = 'Nome é obrigatório.';
      if (!paciente.dataNasc) e.dataNasc = 'Data é obrigatória.';
      if (!paciente.sexo) e.sexo = 'Sexo é obrigatório.';
      if (!paciente.responsavel.trim()) e.responsavel = 'Responsável é obrigatório.';
    }
    if (s === 1) {
      if (!acomp.nome.trim()) e.nomeAcomp = 'Nome é obrigatório.';
      if (!acomp.relacao.trim()) e.relacaoAcomp = 'Relação é obrigatória.';
    }
    if (s === 2) {
      const np = sintomasFiltrados.filter((x) => respostas[x.id] === null);
      if (np.length > 0) e.questionario = `${np.length} pergunta(s) não respondida(s).`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  function avancar() { if (validar(step)) { setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } }
  function voltar() { setErrors({}); setStep(step - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  function setResposta(id, v) {
    setRespostas((p) => ({ ...p, [id]: v }));
    if (errors.questionario) setErrors({});
  }

  const respondidas = sintomasFiltrados.filter((s) => respostas[s.id] !== null).length;
  const progresso = sintomasFiltrados.length ? Math.round((respondidas / sintomasFiltrados.length) * 100) : 0;

  function gerarPDF() {
  console.log(window.jspdf);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const score = calcScore();
  const resultado =
    score >= limiar()
      ? 'Encaminhar para teste genético'
      : 'Baixo risco — acompanhamento';

  let y = 20;

  const linha = (txt, gap = 7) => {
    doc.text(txt, 15, y);
    y += gap;

    if (y > 275) {
      doc.addPage();
      y = 20;
    }
  };

    doc.setFontSize(18);
    linha('Laudo de Triagem — Síndrome do X Frágil', 12);

    doc.setFontSize(12);

    linha('DADOS DO PACIENTE');
    linha(`Nome: ${paciente.nome}`);
    linha(`Nascimento: ${formatarData(paciente.dataNasc)}`);
    linha(`Sexo: ${paciente.sexo === 'M' ? 'Masculino' : 'Feminino'}`);
    linha(`Responsável: ${paciente.responsavel}`, 12);

    linha('DADOS DO ACOMPANHANTE');

    linha(`Nome: ${acomp.nome}`);
    linha(`Relação: ${acomp.relacao}`);

    if (acomp.telefone)
      linha(`Telefone: ${acomp.telefone}`);

    if (acomp.email)
      linha(`E-mail: ${acomp.email}`, 12);

    linha('SINTOMAS AVALIADOS');

    sintomasFiltrados.forEach((s) => {
      linha(
        `${s.label}: ${
          respostas[s.id] === 1
            ? 'Presente'
            : 'Ausente'
        }`
      );
    });

    linha('', 6);
    linha(`Score calculado: ${score.toFixed(2)}`);
    linha(`Limiar utilizado: ${limiar()}`);
    linha(`Resultado: ${resultado}`);

    doc.save(
      `triagem-${(paciente.nome || 'paciente').replaceAll(' ', '_')}.pdf`
    );
  }

  return (
    <div className="anim-fade-in max-w-3xl mx-auto pb-12">

      {/* Header / breadcrumb is in Topbar already */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
          style={{ background: 'var(--hover-tint)', color: 'var(--ink)' }}>
          <span style={{ color: 'var(--ink)' }}>{Icon.cat}</span>
          <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Pré-diagnóstico — Síndrome do X Frágil</span>
        </div>
        <h1 className="font-display text-[44px] leading-[1.05]">
          Triagem — Síndrome do X Frágil
        </h1>
        <p className="text-[13.5px] mt-3 max-w-xl mx-auto" style={{ color: 'var(--muted)' }}>
          Modelo estatístico validado — AUC 0,73 (♂) e 0,76 (♀). Quatro etapas para gerar o encaminhamento ou indicar acompanhamento.
        </p>
      </div>

      <StepIndicator current={step} />

      {step === 0 && (
        <Card className="p-8">
          <h2 className="font-display text-[26px] leading-none mb-1">Dados do paciente</h2>
          <p className="text-[13px] mb-6" style={{ color: 'var(--muted)' }}>
            Informe os dados básicos da pessoa que será avaliada.
          </p>
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
                    }}>
                    {lab}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <Field label="Nome do responsável" required error={errors.responsavel}>
            <input className={inputCls} style={inputStyle} type="text" placeholder="Pai, mãe ou tutor legal"
              value={paciente.responsavel} onChange={(e) => setPaciente({ ...paciente, responsavel: e.target.value })} />
          </Field>
        </Card>
      )}

      {step === 1 && (
        <Card className="p-8">
          <h2 className="font-display text-[26px] leading-none mb-1">Dados do acompanhante</h2>
          <p className="text-[13px] mb-6" style={{ color: 'var(--muted)' }}>
            O acompanhante responderá o questionário de sintomas.
            Cada avaliação deve ser feita com um acompanhante diferente.
          </p>
          <Field label="Nome completo" required error={errors.nomeAcomp}>
            <input className={inputCls} style={inputStyle} type="text" placeholder="Nome do acompanhante"
              value={acomp.nome} onChange={(e) => setAcomp({ ...acomp, nome: e.target.value })} />
          </Field>
          <Field label="Relação com o paciente" required error={errors.relacaoAcomp}>
            <select className={inputCls + ' appearance-none'} style={{ ...inputStyle, backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6862' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
              value={acomp.relacao} onChange={(e) => setAcomp({ ...acomp, relacao: e.target.value })}>
              <option value="">Selecione</option>
              <option>Mãe</option><option>Pai</option><option>Avó / Avô</option>
              <option>Tio / Tia</option><option>Irmão / Irmã</option>
              <option>Cuidador(a)</option><option>Outro</option>
            </select>
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

          <div className="mt-4 rounded-2xl px-5 py-4 flex items-start gap-3"
            style={{ background: 'var(--paper-2)', border: '1px solid var(--hair-soft)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--ink)', color: 'var(--on-ink)' }}>{Icon.paw}</div>
            <div className="text-[12.5px]" style={{ color: 'var(--ink-2)' }}>
              <span className="font-medium">Paciente em avaliação:</span> {paciente.nome || '—'}
              {paciente.sexo && <> · {paciente.sexo === 'M' ? 'Masculino' : 'Feminino'}</>}
              {paciente.dataNasc && <> · nasc. {formatarData(paciente.dataNasc)}</>}
            </div>
          </div>
        </Card>
      )}

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
                  <div key={s.id} className="flex items-center justify-between px-6 py-4 lift"
                    style={{
                      borderBottom: idx < sintomasFiltrados.length - 1 ? '1px solid var(--hair-soft)' : 'none',
                      background: resp === 1 ? 'var(--hover-tint)' : 'transparent',
                    }}>
                    <div className="flex-1 pr-4">
                      <div className="flex items-baseline gap-3">
                        <span className="text-[11px] font-mono num-tabular w-6" style={{ color: 'var(--subtle)' }}>
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="text-[14px]" style={{ color: 'var(--ink)' }}>{s.label}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setResposta(s.id, 0)}
                        className="px-4 py-2.5 rounded-full text-[12px] font-medium lift min-w-[64px]"
                        style={{
                          background: 'var(--surface)',
                          color: resp === 0 ? 'var(--ink)' : 'var(--muted)',
                          border: resp === 0 ? '1px solid var(--ink)' : '1px solid var(--hair)',
                        }}>Não</button>
                      <button onClick={() => setResposta(s.id, 1)}
                        className="px-4 py-2.5 rounded-full text-[12px] font-medium lift min-w-[64px]"
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

      {step === 3 && (
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="text-[10.5px] font-medium uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--muted)' }}>Paciente</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
              <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Nome</span><p>{paciente.nome}</p></div>
              <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Sexo</span><p>{paciente.sexo === 'M' ? 'Masculino' : 'Feminino'}</p></div>
              <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Nascimento</span><p className="font-mono">{formatarData(paciente.dataNasc)}</p></div>
              <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Responsável</span><p>{paciente.responsavel}</p></div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-[10.5px] font-medium uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--muted)' }}>Acompanhante</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
              <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Nome</span><p>{acomp.nome}</p></div>
              <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Relação</span><p>{acomp.relacao}</p></div>
              {acomp.telefone && <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>Telefone</span><p className="font-mono">{acomp.telefone}</p></div>}
              {acomp.email && <div><span className="text-[10.5px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--subtle)' }}>E-mail</span><p>{acomp.email}</p></div>}
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

          <Card className="p-8 relative overflow-hidden" style={{ background: 'var(--ink)' }}>
            <div className="absolute -bottom-6 -right-2 pointer-events-none" style={{ opacity: 0.18, width: 260 }}>
              <img src="assets/cito-tight.png" alt="" className="cito-logo-img on-ink w-full select-none" />
            </div>
            <div className="relative flex items-start justify-between gap-6 flex-wrap">
              <div>
                <div className="text-[10.5px] font-mono uppercase tracking-[0.16em] mb-2" style={{ color: 'var(--on-ink-55)' }}>Score calculado</div>
                <div className="font-display text-[64px] leading-none num-tabular" style={{ color: 'var(--on-ink)' }}>
                  {calcScore().toFixed(2)}
                </div>
                <div className="text-[12px] mt-2" style={{ color: 'var(--on-ink-55)' }}>
                  Limiar de encaminhamento ({paciente.sexo === 'M' ? '♂' : '♀'}): {limiar()}
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

      <div className="flex items-center justify-between mt-8">
        <div>
          {step > 0 && <BtnGhost onClick={voltar}>{Icon.chevronLeft} Voltar</BtnGhost>}
          {step === 0 && <BtnGhost onClick={() => onNav('dashboard')}>{Icon.chevronLeft} Cancelar</BtnGhost>}
        </div>
        <div>
          {step < 3 && <BtnPrimary onClick={avancar}>Continuar {Icon.chevronRight}</BtnPrimary>}
          {step === 3 && (
            <BtnPrimary onClick={() => {gerarPDF();alert('Triagem salva. Resultado: ' + (calcScore() >= limiar() ? 'Encaminhar' : 'Baixo risco')); onNav('dashboard'); }}>
              {Icon.check} Gerar laudo e encaminhar
            </BtnPrimary>
          )}
        </div>
      </div>

    </div>
  );
}
