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
  const [norm, setNorm] = useState([]);

  useEffect(() => {
    db.from('tb_avaliacoes')
      .select('score_final, data_avaliacao, tb_pacientes(sexo, nome_criptografado)')
      .eq('status', 'finalizada')
      .order('data_avaliacao', { ascending: false })
      .then(({ data }) => {
        setNorm((data || []).map(a => {
          const score = Number(a.score_final);
          const sexo = a.tb_pacientes?.sexo;
          return {
            score, sexo,
            nome: decodeNome(a.tb_pacientes?.nome_criptografado) || '—',
            data: new Date(a.data_avaliacao),
            encaminha: score >= (sexo === 'M' ? 0.56 : 0.55),
          };
        }));
      });
  }, []);

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const weekData = [];
  const encData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoje); d.setDate(hoje.getDate() - i);
    weekData.push({ label: diasSemana[d.getDay()], val: norm.filter(a => sameDay(a.data, d)).length });
    encData.push({ label: diasSemana[d.getDay()], val: norm.filter(a => a.encaminha && sameDay(a.data, d)).length });
  }

  const monthData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    monthData.push({ label: meses[d.getMonth()], val: norm.filter(a => a.data.getFullYear() === d.getFullYear() && a.data.getMonth() === d.getMonth()).length });
  }

  const maxWeek  = Math.max(...weekData.map(d => d.val), 1);
  const maxMonth = Math.max(...monthData.map(d => d.val), 1);
  const maxEnc   = Math.max(...encData.map(d => d.val), 1);

  const totalEnc = norm.filter(a => a.encaminha).length;
  const totalBaixo = norm.length - totalEnc;
  const triagensSemana = weekData.reduce((s, d) => s + d.val, 0);
  const totalSeisMeses = monthData.reduce((s, d) => s + d.val, 0);
  const encSemana = encData.reduce((s, d) => s + d.val, 0);
  const taxaEnc = norm.length ? Math.round(totalEnc / norm.length * 100) : 0;
  const ultimas = norm.slice(0, 5);

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
          { label: 'Triagens (semana)', val: String(triagensSemana) },
          { label: 'Encaminhamentos',  val: String(totalEnc) },
          { label: 'Baixo risco',      val: String(totalBaixo) },
          { label: 'Taxa encaminh.',   val: `${taxaEnc}%` },
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
            style={{ color: 'var(--ink)' }}>{triagensSemana} sessões</div>
          <MiniBarChart data={weekData} maxVal={maxWeek} />
        </div>

        <div className="rounded-3xl p-5 card-shadow"
          style={{ background: 'var(--surface)', border: '1px solid var(--hair-soft)' }}>
          <div className="text-[10.5px] font-medium uppercase tracking-[0.14em] mb-1"
            style={{ color: 'var(--muted)' }}>Triagens — 6 meses</div>
          <div className="font-display text-[22px] leading-none mb-4"
            style={{ color: 'var(--ink)' }}>{totalSeisMeses} total</div>
          <MiniBarChart data={monthData} maxVal={maxMonth} />
        </div>

        <div className="rounded-3xl p-5 card-shadow"
          style={{ background: 'var(--surface)', border: '1px solid var(--hair-soft)' }}>
          <div className="text-[10.5px] font-medium uppercase tracking-[0.14em] mb-1"
            style={{ color: 'var(--muted)' }}>Encaminham. — semana</div>
          <div className="font-display text-[22px] leading-none mb-4"
            style={{ color: 'var(--ink)' }}>{encSemana} casos</div>
          <MiniBarChart data={encData} maxVal={maxEnc} color="var(--honey)" />
        </div>
      </div>

      {/* Triagens recentes */}
      <div className="rounded-3xl overflow-hidden card-shadow"
        style={{ background: 'var(--surface)', border: '1px solid var(--hair-soft)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--hair-soft)' }}>
          <h3 className="font-display text-[18px] leading-none">Últimas triagens</h3>
        </div>
        {ultimas.length === 0 && (
          <div className="px-6 py-6 text-[13px]" style={{ color: 'var(--muted)' }}>
            Nenhuma triagem finalizada ainda.
          </div>
        )}
        {ultimas.map((t, i, arr) => (
          <div key={i} className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--hair-soft)' : 'none' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold"
                style={{ background: 'var(--paper-2)', color: 'var(--ink-2)', border: '1px solid var(--hair)' }}>
                {t.sexo}
              </div>
              <div>
                <div className="text-[13.5px] font-medium">{t.nome}</div>
                <div className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
                  {t.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · {t.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono num-tabular text-[14px] font-medium"
                style={{ color: t.encaminha ? 'var(--ink)' : 'var(--subtle)' }}>
                {t.score.toFixed(2)}
              </div>
              <div className="text-[10.5px]" style={{ color: 'var(--muted)' }}>
                {t.encaminha ? 'Encaminhar' : 'Baixo risco'}
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