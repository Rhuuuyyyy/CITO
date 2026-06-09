// ═══════════════════════════════════════════════════════════════════════
// AGENDA
// ═══════════════════════════════════════════════════════════════════════
const AGENDA_TIPOS = ['Triagem SXF', 'Retorno', 'Primeira consulta', 'Encaminhamento', 'Outro'];
const AGENDA_STATUS = [
  ['confirmado', 'Confirmado', 'sage'],
  ['aguardando', 'Aguardando', 'neutral'],
  ['em_atendimento', 'Em atendimento', 'honey'],
  ['pendente', 'Pendente', 'rust'],
];
function statusInfo(s) {
  return AGENDA_STATUS.find((x) => x[0] === s) || AGENDA_STATUS[0];
}
const agSelectArrow = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6862' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")";
const agSelectStyle = { ...inputStyle, backgroundImage: agSelectArrow, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' };

function ModalAgendamento({ onClose, onSalvar }) {
  const [pacientes, setPacientes] = useState([]);
  const [form, setForm] = useState({ pacienteId: '', titulo: '', tipo: 'Triagem SXF', data: '', hora: '', status: 'confirmado' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api.getPacientes({ limit: 200 })
      .then((data) => setPacientes((data.items || []).map((p) => ({ id: p.id, nome: p.nome }))))
      .catch((err) => console.error('Erro ao carregar pacientes:', err));
  }, []);

  function escolherPaciente(id) {
    const p = pacientes.find((x) => String(x.id) === String(id));
    setForm((f) => ({ ...f, pacienteId: id, titulo: p ? p.nome : f.titulo }));
  }

  async function salvar() {
    if (!form.titulo.trim() || !form.data || !form.hora) {
      setErro('Preencha paciente/título, data e horário.');
      return;
    }
    setSalvando(true);
    await onSalvar(form);
    setSalvando(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-md flex flex-col rounded-3xl card-shadow anim-fade-up"
        style={{ background: 'var(--surface)', border: '1px solid var(--hair)' }}>

        <div className="flex items-center justify-between px-7 pt-7 pb-5"
          style={{ borderBottom: '1px solid var(--hair-soft)' }}>
          <h2 className="font-display text-[24px] leading-none">Novo agendamento</h2>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center lift"
            style={{ border: '1px solid var(--hair)', color: 'var(--muted)' }}>
            {Icon.x}
          </button>
        </div>

        <div className="px-7 py-6 space-y-1">
          {erro && (
            <div className="rounded-2xl px-4 py-3 mb-4 text-[12.5px]"
              style={{ background: 'var(--rust-soft)', color: 'var(--rust)' }}>{erro}</div>
          )}

          <Field label="Paciente cadastrado">
            <select className={`${inputCls} focus-ink appearance-none`} style={agSelectStyle}
              value={form.pacienteId} onChange={(e) => escolherPaciente(e.target.value)}>
              <option value="">— Selecionar (opcional) —</option>
              {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Field>

          <Field label="Paciente / título" required>
            <input className={`${inputCls} focus-ink`} style={inputStyle} type="text"
              placeholder="Nome do paciente ou título"
              value={form.titulo}
              onChange={(e) => { setForm({ ...form, titulo: e.target.value }); setErro(''); }} />
          </Field>

          <Field label="Tipo">
            <select className={`${inputCls} focus-ink appearance-none`} style={agSelectStyle}
              value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {AGENDA_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Data" required>
              <input className={`${inputCls} focus-ink`} style={inputStyle} type="date"
                value={form.data} onChange={(e) => { setForm({ ...form, data: e.target.value }); setErro(''); }} />
            </Field>
            <Field label="Horário" required>
              <input className={`${inputCls} focus-ink font-mono`} style={inputStyle} type="time"
                value={form.hora} onChange={(e) => { setForm({ ...form, hora: e.target.value }); setErro(''); }} />
            </Field>
          </div>

          <Field label="Status">
            <select className={`${inputCls} focus-ink appearance-none`} style={agSelectStyle}
              value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {AGENDA_STATUS.map(([v, lab]) => <option key={v} value={v}>{lab}</option>)}
            </select>
          </Field>
        </div>

        <div className="flex items-center justify-between px-7 py-5"
          style={{ borderTop: '1px solid var(--hair-soft)' }}>
          <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
          <BtnPrimary onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : <>{Icon.check} Agendar</>}
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

function AgendaPage({ usuario }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const data = await api.getAgendamentos();
      setAgendamentos(data || []);
    } catch (err) {
      console.error('Erro ao carregar agenda:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function salvarAgendamento(form) {
    try {
      await api.createAgendamento({
        titulo: form.titulo.trim(),
        tipo: form.tipo,
        data_hora: `${form.data}T${form.hora}:00`,
        status: form.status,
        paciente_id: form.pacienteId ? Number(form.pacienteId) : null,
      });
    } catch (err) {
      console.error('Erro ao agendar:', err);
      alert('Não foi possível criar o agendamento: ' + (err.message || 'erro desconhecido'));
      return;
    }
    setModal(false);
    carregar();
  }

  const hoje = new Date();
  const marks = {};
  agendamentos.forEach((a) => {
    const d = new Date(a.data_hora);
    if (d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear()) marks[d.getDate()] = true;
  });

  return (
    <div className="anim-fade-in grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
      <div className="space-y-5">
        <Card className="p-6">
          <CalendarWidget marks={marks} />
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--hair-soft)' }}>
            <BtnPrimary className="w-full justify-center" onClick={() => setModal(true)}>
              {Icon.plus} Novo agendamento
            </BtnPrimary>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--muted)' }}>Legenda</div>
          <div className="space-y-2 text-[12.5px]">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--sage)' }}/>Confirmado</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--honey)' }}/>Em atendimento</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--rust)' }}/>Pendente</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--ink-2)' }}/>Aguardando</div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--hair-soft)' }}>
          <div>
            <div className="text-[10.5px] font-medium uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Agendamentos</div>
            <h3 className="font-display text-[26px] leading-none mt-1">Próximas consultas</h3>
          </div>
          <BtnGhost onClick={() => window.print()}>{Icon.print} Imprimir</BtnGhost>
        </div>
        <div className="p-6">
          {loading && <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Carregando agenda…</p>}
          {!loading && agendamentos.length === 0 && (
            <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Nenhum agendamento. Clique em “Novo agendamento” para criar.</p>
          )}
          {!loading && agendamentos.length > 0 && (
            <div className="relative pl-6" style={{ borderLeft: '1px dashed var(--hair)' }}>
              {agendamentos.map((a) => {
                const d = new Date(a.data_hora);
                const [, label, tone] = statusInfo(a.status);
                return (
                  <div key={a.id} className="relative pb-5 last:pb-0">
                    <div className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full"
                      style={{ background: 'var(--ink)', boxShadow: '0 0 0 4px var(--paper)' }} />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono text-[11px] font-medium mb-1" style={{ color: 'var(--muted)' }}>
                          {d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="font-display text-[20px] leading-tight">{a.titulo}</div>
                        <div className="text-[12.5px] mt-1" style={{ color: 'var(--muted)' }}>{a.tipo}</div>
                      </div>
                      <Pill tone={tone}>{label}</Pill>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {modal && <ModalAgendamento onClose={() => setModal(false)} onSalvar={salvarAgendamento} />}
    </div>
  );
}
