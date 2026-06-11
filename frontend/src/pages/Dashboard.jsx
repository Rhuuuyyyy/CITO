// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD — mobile-first, hover interativo, modal reagendar funcional
// ═══════════════════════════════════════════════════════════════════════

// ── Modal de reagendamento ───────────────────────────────────────────
function ModalReagendar({ appt, onClose, onSaved }) {
  const [data, setData]   = useState('');
  const [hora, setHora]   = useState('');
  const [motivo, setMotivo] = useState('');
  const [ok, setOk]       = useState(false);
  const [erro, setErro]   = useState('');
  const [salvando, setSalvando] = useState(false);

  async function confirmar() {
    if (!data || !hora) return;
    setSalvando(true);
    setErro('');
    try {
      await api.updateAgendamento(appt.id, {
        titulo: appt.titulo,
        tipo: appt.tipo,
        data_hora: `${data}T${hora}:00`,
        status: appt.statusRaw,
      });
    } catch (e) {
      console.error('Erro ao reagendar:', e);
      setErro(e.message || 'Não foi possível reagendar.');
      setSalvando(false);
      return;
    }
    setSalvando(false);
    setOk(true);
    if (onSaved) onSaved();
    setTimeout(onClose, 1400);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 anim-fade-in"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl anim-fade-up card-shadow"
        style={{ background: 'var(--surface)', border: '1px solid var(--hair)' }}>

        {/* Handle mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--hair)' }} />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4"
          style={{ borderBottom: '1px solid var(--hair-soft)' }}>
          <div>
            <h3 className="font-display text-[22px] leading-none">Reagendar consulta</h3>
            <p className="text-[12.5px] mt-1" style={{ color: 'var(--muted)' }}>
              {appt.name} · {appt.type}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center lift"
            style={{ border: '1px solid var(--hair)', color: 'var(--muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}>
            {Icon.x}
          </button>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5 space-y-4">
          {ok ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'var(--ink)', color: 'var(--on-ink)' }}>
                {Icon.check}
              </div>
              <p className="font-display text-[20px]">Reagendado!</p>
              <p className="text-[12.5px]" style={{ color: 'var(--muted)' }}>
                Nova data: {data.split('-').reverse().join('/')} às {hora}
              </p>
            </div>
          ) : (
            <>
              {/* Data atual */}
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl"
                style={{ background: 'var(--paper-2)', border: '1px solid var(--hair-soft)' }}>
                <span className="text-[12.5px]" style={{ color: 'var(--muted)' }}>Data atual</span>
                <span className="font-mono text-[13px]" style={{ color: 'var(--ink-2)' }}>
                  {appt.time} — hoje
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.12em] mb-1.5"
                    style={{ color: 'var(--muted)' }}>Nova data *</label>
                  <input type="date" value={data} onChange={(e) => setData(e.target.value)}
                    className={`${inputCls} focus-ink`} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.12em] mb-1.5"
                    style={{ color: 'var(--muted)' }}>Novo horário *</label>
                  <input type="time" value={hora} onChange={(e) => setHora(e.target.value)}
                    className={`${inputCls} focus-ink font-mono`} style={inputStyle} />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-[0.12em] mb-1.5"
                  style={{ color: 'var(--muted)' }}>Motivo</label>
                <div className="flex flex-wrap gap-2">
                  {['Solicitação do paciente','Agenda médica','Urgência','Outro'].map((m) => (
                    <button key={m} type="button" onClick={() => setMotivo(m)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium lift"
                      style={{
                        background: motivo === m ? 'var(--ink)' : 'var(--surface)',
                        color: motivo === m ? 'var(--on-ink)' : 'var(--ink-2)',
                        border: motivo === m ? '1px solid var(--ink)' : '1px solid var(--hair)',
                      }}>{m}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!ok && (
          <div className="px-6 py-4" style={{ borderTop: '1px solid var(--hair-soft)' }}>
            {erro && <p className="text-[12.5px] mb-3" style={{ color: 'var(--rust)' }}>{erro}</p>}
            <div className="flex items-center justify-between">
              <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
              <BtnPrimary onClick={confirmar} disabled={!data || !hora || salvando}>
                {salvando ? 'Salvando…' : <>{Icon.check} Confirmar reagendamento</>}
              </BtnPrimary>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card de stat com hover ───────────────────────────────────────────
function StatCard({ label, value, detail, sub }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setTimeout(() => setHovered(false), 1200)}
      className="rounded-3xl p-5 relative overflow-hidden lift cursor-default"
      style={{
        background: hovered ? 'var(--ink)' : 'var(--surface)',
        border: '1px solid var(--hair-soft)',
        transition: 'background 0.28s ease, box-shadow 0.28s ease',
        boxShadow: hovered
          ? '0 12px 32px -10px rgba(0,0,0,0.18)'
          : '0 1px 0 rgba(0,0,0,0.02), 0 4px 12px -6px rgba(0,0,0,0.05)',
        minHeight: 140,
      }}>

      {/* Estado padrão */}
      <div style={{
        opacity: hovered ? 0 : 1,
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}>
        <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] mb-3"
          style={{ color: 'var(--muted)' }}>{label}</div>
        <div className="font-display text-[48px] leading-none num-tabular"
          style={{ color: 'var(--ink)' }}>{value}</div>
        <div className="text-[11.5px] mt-2" style={{ color: 'var(--subtle)' }}>{sub}</div>
      </div>

      {/* Estado hover */}
      <div className="absolute inset-0 p-5 flex flex-col justify-between" style={{
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.22s ease 0.06s, transform 0.22s ease 0.06s',
        pointerEvents: hovered ? 'auto' : 'none',
      }}>
        <div className="text-[10.5px] font-medium uppercase tracking-[0.16em]"
          style={{ color: 'var(--on-ink-55)' }}>{label}</div>
        <div>
          <div className="font-display text-[48px] leading-none num-tabular"
            style={{ color: 'var(--on-ink)' }}>{value}</div>
          <div className="mt-3 space-y-1.5">
            {detail.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-[12.5px]">
                <span style={{ color: 'var(--on-ink-55)' }}>{d.label}</span>
                <span className="font-medium" style={{ color: 'var(--on-ink)' }}>{d.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Linha da agenda com hover + reagendar ────────────────────────────
function AgendaRow({ appt, onNav, isLast, onReagendar, onProntuario }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(!hovered)}
      className="px-5 py-4 lift"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--hair-soft)',
        background: hovered ? 'var(--paper-2)' : 'transparent',
        transition: 'background 0.18s ease',
      }}>

      <div className="flex items-center gap-4">
        <div className="w-14 flex-shrink-0">
          <div className="font-mono num-tabular text-[13px] font-medium"
            style={{ color: 'var(--ink)' }}>{appt.time}</div>
        </div>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
            style={{ background: 'var(--ink)', color: 'var(--on-ink)' }}>
            {appt.name.split(' ').map(n => n[0]).slice(0,2).join('')}
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-medium truncate" style={{ color: 'var(--ink)' }}>
              {appt.name}
            </div>
            <div className="text-[12px] flex items-center gap-1.5 mt-0.5"
              style={{ color: 'var(--muted)' }}>
              <span>{appt.type}</span>
              {appt.age && <span style={{ color: 'var(--hair)' }}>·</span>}
              {appt.age && <span className="font-mono">{appt.age}</span>}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0">
          <Pill tone={appt.status}>{appt.statusLabel}</Pill>
        </div>
      </div>

      {/* Ações reveladas no hover */}
      <div className="flex gap-2 overflow-hidden mt-0"
        style={{
          maxHeight: hovered ? '52px' : '0px',
          opacity: hovered ? 1 : 0,
          marginTop: hovered ? '12px' : '0px',
          transition: 'max-height 0.26s ease, opacity 0.2s ease, margin-top 0.26s ease',
        }}>
        <button onClick={() => onNav('triagem')}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium lift"
          style={{ background: 'var(--ink)', color: 'var(--on-ink)' }}>
          {Icon.cat} Iniciar triagem
        </button>
        <button
          onClick={() => onProntuario(appt)}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium lift"
          style={{ border: '1px solid var(--hair)', color: 'var(--ink-2)' }}>
          {Icon.file} Prontuário
        </button>
        <button
          onClick={() => onReagendar(appt)}
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium lift"
          style={{ border: '1px solid var(--hair)', color: 'var(--ink-2)' }}>
          {Icon.calendar} Reagendar
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════
function DashboardPage({ onNav }) {
  const [modalReagendar, setModalReagendar] = useState(null);

  const [stats, setStats] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loadingAg, setLoadingAg] = useState(true);

  useEffect(() => {
    async function carregar() {
      let s;
      try {
        s = await api.getDashboardSummary();
      } catch (err) {
        console.error('Erro ao carregar resumo do dashboard:', err);
        return;
      }

      const pct = s.taxa_recomendacao_exame != null
        ? Math.round(s.taxa_recomendacao_exame * 100) + '%'
        : '—';

      setStats([
        {
          label: 'Triagens hoje', value: String(s.avaliacoes_hoje), sub: 'Sessões clínicas',
          detail: [
            { label: 'Na semana',       val: String(s.avaliacoes_semana) },
            { label: 'Pacientes ativos', val: String(s.total_pacientes) },
            { label: 'Taxa encaminh.',  val: pct },
          ],
        },
        {
          label: 'Avaliações · 7 dias', value: String(s.avaliacoes_semana), sub: 'Últimos 7 dias',
          detail: [
            { label: 'Hoje',           val: String(s.avaliacoes_hoje) },
            { label: 'Pacientes',      val: String(s.total_pacientes) },
            { label: 'Taxa encaminh.', val: pct },
          ],
        },
        {
          label: 'Taxa de encaminhamento', value: pct, sub: 'Para teste genético',
          detail: [
            { label: 'Limiar ♂',       val: '≥ 0.56' },
            { label: 'Limiar ♀',       val: '≥ 0.55' },
            { label: 'Avaliações 7d',  val: String(s.avaliacoes_semana) },
          ],
        },
        {
          label: 'Pacientes ativos', value: String(s.total_pacientes), sub: 'Em prontuário',
          detail: [
            { label: 'Avaliações hoje', val: String(s.avaliacoes_hoje) },
            { label: 'Avaliações 7d',   val: String(s.avaliacoes_semana) },
            { label: 'Taxa encaminh.',  val: pct },
          ],
        },
      ]);
    }
    carregar();
  }, []);

  // Agenda real do dia (mesmo endpoint da página Agenda; escopo = médico do JWT).
  function carregarAgenda() {
    const STATUS = {
      confirmado:     ['sage',    'Confirmado'],
      aguardando:     ['neutral', 'Aguardando'],
      em_atendimento: ['honey',   'Em atendimento'],
      pendente:       ['rust',    'Pendente'],
    };
    const hoje = new Date();
    const mesmoDia = (d) =>
      d.getFullYear() === hoje.getFullYear() &&
      d.getMonth() === hoje.getMonth() &&
      d.getDate() === hoje.getDate();

    setLoadingAg(true);
    api.getAgendamentos()
      .then((data) => {
        const doDia = (data || [])
          .map((a) => ({ ...a, _d: new Date(a.data_hora) }))
          .filter((a) => mesmoDia(a._d))
          .sort((a, b) => a._d - b._d)
          .map((a) => {
            const [tone, label] = STATUS[a.status] || ['neutral', a.status];
            return {
              // campos de exibição
              time: a._d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              name: a.titulo,
              type: a.tipo || '—',
              age: '',
              status: tone,
              statusLabel: label,
              // campos crus (para ações reais)
              id: a.id,
              paciente_id: a.paciente_id != null ? a.paciente_id : null,
              titulo: a.titulo,
              tipo: a.tipo,
              statusRaw: a.status,
              data_hora: a.data_hora,
            };
          });
        setAppointments(doDia);
      })
      .catch((err) => console.error('Erro ao carregar agenda do dia:', err))
      .finally(() => setLoadingAg(false));
  }

  useEffect(() => { carregarAgenda(); }, []);

  return (
    <div className="anim-fade-in space-y-5">

      {/* ── HERO ── */}
      <Card className="p-6 sm:p-8 relative overflow-hidden" style={{ background: 'var(--ink)' }}>
        <div className="absolute -bottom-6 -right-4 pointer-events-none select-none"
          style={{ opacity: 0.07, width: 260 }}>
          <img src="assets/cito-tight.png" alt="" className="cito-logo-img on-ink w-full" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--on-ink-55)', animation: 'purrPulse 2.4s ease-in-out infinite' }} />
            <span className="text-[10.5px] font-mono uppercase tracking-[0.2em]"
              style={{ color: 'var(--on-ink-55)' }}>
              CITO · pré-diagnóstico SXF · SUS · CAAE 47291
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            <div>
              <h2 className="font-display leading-[1.05]"
                style={{ fontSize: 'clamp(28px, 5vw, 44px)', color: 'var(--on-ink)' }}>
                Painel clínico — CITO
              </h2>
              <p className="text-[13px] mt-2" style={{ color: 'var(--on-ink-55)', lineHeight: 1.6 }}>
                Limiares ativos: ♂ 0.56 · ♀ 0.55
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onNav('triagem')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-[13px] font-medium lift"
                style={{ background: 'var(--on-ink)', color: 'var(--ink)' }}>
                {Icon.cat} Nova triagem
              </button>
              <button onClick={() => onNav('agenda')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-[13px] font-medium lift"
                style={{ background: 'var(--on-ink-08)', color: 'var(--on-ink)', border: '1px solid var(--on-ink-14)' }}>
                {Icon.calendar} Agenda
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* ── AGENDA ── */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3"
          style={{ borderBottom: '1px solid var(--hair-soft)' }}>
          <div>
            <h3 className="font-display text-[22px] leading-none">Agenda de hoje</h3>
            <div className="text-[12px] mt-1" style={{ color: 'var(--muted)' }}>
              {loadingAg
                ? 'Carregando…'
                : `${appointments.length} ${appointments.length === 1 ? 'consulta' : 'consultas'} · passe o mouse para ver ações`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BtnGhost onClick={() => onNav('agenda')}>{Icon.calendar} Ver agenda</BtnGhost>
            <BtnPrimary onClick={() => onNav('triagem')}>{Icon.plus} Nova triagem</BtnPrimary>
          </div>
        </div>

        <div>
          {loadingAg && (
            <div className="px-5 py-8 text-center text-[13px]" style={{ color: 'var(--muted)' }}>
              Carregando agenda…
            </div>
          )}
          {!loadingAg && appointments.length === 0 && (
            <div className="px-5 py-8 text-center text-[13px]" style={{ color: 'var(--muted)' }}>
              Nenhuma consulta agendada para hoje.
            </div>
          )}
          {!loadingAg && appointments.map((a, i) => (
            <AgendaRow
              key={i}
              appt={a}
              onNav={onNav}
              isLast={i === appointments.length - 1}
              onReagendar={(appt) => setModalReagendar(appt)}
              onProntuario={(appt) => onNav('pacientes', appt.paciente_id ? { pacienteId: appt.paciente_id } : null)}
            />
          ))}
        </div>

        <div className="px-5 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--hair-soft)', background: 'var(--paper-2)' }}>
          <span className="text-[11.5px]" style={{ color: 'var(--muted)' }}>
            {appointments.length} {appointments.length === 1 ? 'consulta hoje' : 'consultas hoje'}
          </span>
          <button className="text-[12px] font-medium lift"
            style={{ color: 'var(--ink)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}>
            {Icon.print} Imprimir agenda
          </button>
        </div>
      </Card>

      {/* ── MODAL REAGENDAR ── */}
      {modalReagendar && (
        <ModalReagendar
          appt={modalReagendar}
          onClose={() => setModalReagendar(null)}
          onSaved={carregarAgenda}
        />
      )}
    </div>
  );
}