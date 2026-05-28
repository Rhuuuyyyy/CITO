// ═══════════════════════════════════════════════════════════════════════
// AGENDA
// ═══════════════════════════════════════════════════════════════════════
function AgendaPage() {
  const events = [
    { time: '08:30', name: 'Lívia Andrade', type: 'Triagem SXF', status: 'sage' },
    { time: '09:15', name: 'Joaquim Pessoa', type: 'Retorno', status: 'neutral' },
    { time: '10:00', name: 'Beatriz Coelho', type: 'Primeira consulta', status: 'honey' },
    { time: '10:45', name: 'Davi Reinaldo', type: 'Triagem SXF', status: 'sage' },
    { time: '11:30', name: 'Sofia Vidigal', type: 'Encaminhamento', status: 'rust' },
    { time: '14:00', name: 'Théo Ramires', type: 'Retorno', status: 'sage' },
  ];

  const today = new Date();
  const marks = { 14: true, 15: true, 17: true, 20: true, 22: true, 27: true };

  return (
    <div className="anim-fade-in grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
      <div className="space-y-5">
        <Card className="p-6">
          <CalendarWidget marks={marks} />
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--hair-soft)' }}>
            <BtnPrimary className="w-full justify-center">{Icon.plus} Novo agendamento</BtnPrimary>
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
            <div className="text-[10.5px] font-medium uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Quarta-feira</div>
            <h3 className="font-display text-[26px] leading-none mt-1">14 de Maio, 2026</h3>
          </div>
          <BtnGhost>{Icon.print} Imprimir</BtnGhost>
        </div>
        <div className="p-6">
          <div className="relative pl-6" style={{ borderLeft: '1px dashed var(--hair)' }}>
            {events.map((e, i) => (
              <div key={i} className="relative pb-5 last:pb-0">
                <div className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full"
                  style={{ background: 'var(--ink)', boxShadow: '0 0 0 4px var(--paper)' }} />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[11px] font-medium mb-1" style={{ color: 'var(--muted)' }}>{e.time}</div>
                    <div className="font-display text-[20px] leading-tight">{e.name}</div>
                    <div className="text-[12.5px] mt-1" style={{ color: 'var(--muted)' }}>{e.type}</div>
                  </div>
                  <Pill tone={e.status}>
                    {e.status === 'sage' ? 'Confirmado' : e.status === 'honey' ? 'Em atendimento' : e.status === 'rust' ? 'Pendente' : 'Aguardando'}
                  </Pill>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
