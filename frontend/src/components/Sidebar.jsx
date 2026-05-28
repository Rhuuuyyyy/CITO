// ═══════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════
function Sidebar({ active, onNav, open, onClose, onLogout }) {
  const sections = [
    {
      label: 'Painel', items: [
        { id: 'dashboard', label: 'Visão geral',  icon: Icon.grid },
        { id: 'agenda',    label: 'Agenda',       icon: Icon.calendar },
        { id: 'triagem',   label: 'Nova triagem', icon: Icon.cat, accent: true },
      ]
    },
    {
      label: 'Pessoas', items: [
        { id: 'pacientes',    label: 'Pacientes',    icon: Icon.users },
      ]
    },
    {
      label: 'Sistema', items: [
        { id: 'config', label: 'Configurações', icon: Icon.settings },
      ]
    },
  ];

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden anim-fade-in" onClick={onClose} />
      )}
      <aside className={`fixed top-0 left-0 bottom-0 w-[252px] z-40 transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}
        style={{ background: 'var(--surface-2)', borderRight: '1px solid var(--hair-soft)' }}>

        <div className="px-6 pt-6 pb-5 flex justify-center">
          <CitoLogo size={60} />
        </div>

        <nav className="flex-1 px-3 overflow-y-auto pb-4">
          {sections.map((s) => (
            <div key={s.label} className="mb-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] px-3 mb-2"
                style={{ color: 'var(--subtle)' }}>{s.label}</p>
              {s.items.map((it) => {
                const isActive = active === it.id;
                return (
                  <button key={it.id} onClick={() => onNav(it.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[13.5px] font-normal mb-0.5 lift relative"
                    style={{
                      background: isActive ? 'var(--ink)' : 'transparent',
                      color: isActive ? 'var(--on-ink)' : 'var(--ink-2)',
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--hover-tint)'; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                    <span style={{ color: isActive ? 'var(--on-ink-55)' : (it.accent ? 'var(--ink)' : 'var(--muted)') }}>
                      {it.icon}
                    </span>
                    {it.label}
                    {it.accent && !isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ink)' }} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-4 pb-5">
          <div className="rounded-2xl p-3.5" style={{ background: 'var(--surface)', border: '1px solid var(--hair)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold"
                style={{ background: 'var(--ink)', color: 'var(--on-ink)' }}>AM</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>Dr. Antônia Mello</div>
                <div className="text-[11px]" style={{ color: 'var(--muted)' }}>Clínica Geral · CRM 28941</div>
              </div>
            </div>
            <button onClick={onLogout}
              className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] lift"
              style={{ color: 'var(--muted)', border: '1px solid var(--hair-soft)', background: 'transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--rust)';
                e.currentTarget.style.borderColor = 'var(--hair)';
                e.currentTarget.style.background = 'var(--rust-soft)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--muted)';
                e.currentTarget.style.borderColor = 'var(--hair-soft)';
                e.currentTarget.style.background = 'transparent';
              }}>
              {Icon.logout} Encerrar sessão
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}