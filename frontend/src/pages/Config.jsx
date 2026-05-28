// ═══════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════

// ── Mini gráfico de barras ───────────────────────────────────────────
function MiniBarChart({ data, maxVal, color = 'var(--ink)' }) {
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d, i) => {
        const h = Math.max(4, (d.val / maxVal) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 justify-end h-full">
            <div className="w-full rounded-t-lg lift"
              style={{ height: `${h}%`, background: color, opacity: i === data.length - 1 ? 1 : 0.35 }} />
            <span className="text-[9px] font-mono" style={{ color: 'var(--subtle)' }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Card de configuração clicável ────────────────────────────────────
function ConfigCard({ icon, tag, title, desc, onClick }) {
  return (
    <div onClick={onClick}
      className="rounded-3xl p-6 cursor-pointer lift card-shadow card-shadow-hover"
      style={{ background: 'var(--surface)', border: '1px solid var(--hair-soft)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--hair)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--hair-soft)'; }}>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--ink)', color: 'var(--on-ink)' }}>{icon}</div>
      <div className="text-[10px] font-mono uppercase tracking-[0.14em] mb-1.5"
        style={{ color: 'var(--muted)' }}>{tag}</div>
      <h3 className="font-display text-[20px] leading-tight mb-1.5">{title}</h3>
      <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--muted)' }}>{desc}</p>
    </div>
  );
}

// ── Seção de relatórios / gráficos ───────────────────────────────────
function RelatoriosSection({ onBack }) {
  const weekData = [
    { label: 'Seg', val: 8 }, { label: 'Ter', val: 11 },
    { label: 'Qua', val: 14 }, { label: 'Qui', val: 9 },
    { label: 'Sex', val: 12 }, { label: 'Sáb', val: 5 },
  ];
  const monthData = [
    { label: 'Jan', val: 42 }, { label: 'Fev', val: 38 },
    { label: 'Mar', val: 55 }, { label: 'Abr', val: 61 },
    { label: 'Mai', val: 48 }, { label: 'Jun', val: 70 },
  ];
  const encData = [
    { label: 'Seg', val: 2 }, { label: 'Ter', val: 3 },
    { label: 'Qua', val: 4 }, { label: 'Qui', val: 2 },
    { label: 'Sex', val: 3 }, { label: 'Sáb', val: 1 },
  ];

  const maxWeek  = Math.max(...weekData.map(d => d.val));
  const maxMonth = Math.max(...monthData.map(d => d.val));
  const maxEnc   = Math.max(...encData.map(d => d.val));

  return (
    <div className="anim-fade-in space-y-5">
      <button onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium lift mb-1"
        style={{ color: 'var(--muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}>
        {Icon.chevronLeft} Voltar para configurações
      </button>

      <div>
        <h2 className="font-display text-[28px] leading-none">Relatórios e gráficos</h2>
        <p className="text-[13px] mt-1.5" style={{ color: 'var(--muted)' }}>
          Atividade clínica e indicadores de triagem
        </p>
      </div>

      {/* Resumo numérico */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Triagens (semana)', val: '59' },
          { label: 'Encaminhamentos',  val: '15' },
          { label: 'Baixo risco',      val: '44' },
          { label: 'Taxa encaminh.',   val: '25%' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--hair-soft)' }}>
            <div className="text-[10.5px] font-medium uppercase tracking-[0.14em] mb-2"
              style={{ color: 'var(--muted)' }}>{s.label}</div>
            <div className="font-display text-[32px] leading-none num-tabular"
              style={{ color: 'var(--ink)' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl p-5 card-shadow"
          style={{ background: 'var(--surface)', border: '1px solid var(--hair-soft)' }}>
          <div className="text-[10.5px] font-medium uppercase tracking-[0.14em] mb-1"
            style={{ color: 'var(--muted)' }}>Triagens — semana</div>
          <div className="font-display text-[22px] leading-none mb-4"
            style={{ color: 'var(--ink)' }}>59 sessões</div>
          <MiniBarChart data={weekData} maxVal={maxWeek} />
        </div>

        <div className="rounded-3xl p-5 card-shadow"
          style={{ background: 'var(--surface)', border: '1px solid var(--hair-soft)' }}>
          <div className="text-[10.5px] font-medium uppercase tracking-[0.14em] mb-1"
            style={{ color: 'var(--muted)' }}>Triagens — 6 meses</div>
          <div className="font-display text-[22px] leading-none mb-4"
            style={{ color: 'var(--ink)' }}>314 total</div>
          <MiniBarChart data={monthData} maxVal={maxMonth} />
        </div>

        <div className="rounded-3xl p-5 card-shadow"
          style={{ background: 'var(--surface)', border: '1px solid var(--hair-soft)' }}>
          <div className="text-[10.5px] font-medium uppercase tracking-[0.14em] mb-1"
            style={{ color: 'var(--muted)' }}>Encaminham. — semana</div>
          <div className="font-display text-[22px] leading-none mb-4"
            style={{ color: 'var(--ink)' }}>15 casos</div>
          <MiniBarChart data={encData} maxVal={maxEnc} color="var(--honey)" />
        </div>
      </div>

      {/* Triagens recentes */}
      <div className="rounded-3xl overflow-hidden card-shadow"
        style={{ background: 'var(--surface)', border: '1px solid var(--hair-soft)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--hair-soft)' }}>
          <h3 className="font-display text-[18px] leading-none">Últimas triagens</h3>
        </div>
        {[
          { paciente: 'Lívia Andrade',  sexo: 'F', score: 0.61, resultado: 'encaminhar', data: '14/05', hora: '08:30' },
          { paciente: 'Davi Reinaldo',  sexo: 'M', score: 0.42, resultado: 'baixo',      data: '13/05', hora: '16:20' },
          { paciente: 'Beatriz Coelho', sexo: 'F', score: 0.58, resultado: 'encaminhar', data: '13/05', hora: '14:10' },
          { paciente: 'Théo Ramires',   sexo: 'M', score: 0.31, resultado: 'baixo',      data: '12/05', hora: '11:00' },
        ].map((t, i, arr) => (
          <div key={i} className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--hair-soft)' : 'none' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold"
                style={{ background: 'var(--paper-2)', color: 'var(--ink-2)', border: '1px solid var(--hair)' }}>
                {t.sexo}
              </div>
              <div>
                <div className="text-[13.5px] font-medium">{t.paciente}</div>
                <div className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
                  {t.data} · {t.hora}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono num-tabular text-[14px] font-medium"
                style={{ color: t.resultado === 'encaminhar' ? 'var(--ink)' : 'var(--subtle)' }}>
                {t.score.toFixed(2)}
              </div>
              <div className="text-[10.5px]" style={{ color: 'var(--muted)' }}>
                {t.resultado === 'encaminhar' ? 'Encaminhar' : 'Baixo risco'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL DE CONFIG
// ═══════════════════════════════════════════════════════════════════════
function ConfigPage() {
  const [sub, setSub] = useState(null); // null | 'relatorios'

  if (sub === 'relatorios') {
    return <RelatoriosSection onBack={() => setSub(null)} />;
  }

  const cards = [
    {
      icon: Icon.file,     tag: 'Análise',
      title: 'Relatórios e gráficos',
      desc:  'Visualize a atividade semanal, encaminhamentos e histórico de triagens.',
      action: () => setSub('relatorios'),
    },
    {
      icon: Icon.calendar, tag: 'Clínico',
      title: 'Gerência de agenda',
      desc:  'Remarque, cancele ou reagende consultas já cadastradas no sistema.',
      action: () => {},
    },
    {
      icon: Icon.print,    tag: 'Documentos',
      title: 'Modelos de impressos',
      desc:  'Gerencie modelos de receitas, laudos e atestados médicos.',
      action: () => {},
    },
    {
      icon: Icon.phone,    tag: 'Contatos',
      title: 'Agenda telefônica',
      desc:  'Gerencie os contatos de telefone associados aos seus pacientes.',
      action: () => {},
    },
    {
      icon: Icon.sparkle,  tag: 'Avançado',
      title: 'Parâmetros do escore',
      desc:  'Ajuste limiares de encaminhamento por sexo (♂ 0.56 · ♀ 0.55).',
      action: () => {},
    },
    {
      icon: Icon.users,    tag: 'Acesso',
      title: 'Equipe clínica',
      desc:  'Cadastre médicos, técnicos e gerencie permissões de acesso.',
      action: () => {},
    },
  ];

  return (
    <div className="anim-fade-in space-y-6">
      <div>
        <h2 className="font-display text-[28px] leading-none">Configurações</h2>
        <p className="text-[13px] mt-1.5" style={{ color: 'var(--muted)' }}>
          Gerencie o módulo clínico CITO
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <ConfigCard key={i} {...c} onClick={c.action} />
        ))}
      </div>
    </div>
  );
}