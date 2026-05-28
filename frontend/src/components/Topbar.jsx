// ═══════════════════════════════════════════════════════════════════════
// TOPBAR
// ═══════════════════════════════════════════════════════════════════════
function Topbar({ title, subtitle, onMenu, children }) {
  return (
    <header className="sticky top-0 z-20 h-[68px] px-6 lg:px-10 flex items-center justify-between"
      style={{ background: 'var(--topbar-bg)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--hair-soft)' }}>
      <div className="flex items-center gap-4">
        <button onClick={onMenu} className="lg:hidden flex flex-col gap-1 p-1.5">
          <span className="w-5 h-px block" style={{ background: 'var(--ink)' }} />
          <span className="w-5 h-px block" style={{ background: 'var(--ink)' }} />
          <span className="w-5 h-px block" style={{ background: 'var(--ink)' }} />
        </button>
        <div>
          <h1 className="font-display text-[26px] leading-none">{title}</h1>
          <div className="text-[12px] mt-1" style={{ color: 'var(--muted)' }}>{subtitle}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {children}
        <button className="w-10 h-10 rounded-full flex items-center justify-center lift relative"
          style={{ background: 'var(--surface)', border: '1px solid var(--hair)', color: 'var(--ink)' }}>
          {Icon.bell}
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: 'var(--ink)', boxShadow: '0 0 0 2px var(--surface)' }} />
        </button>
        <div className="hidden md:flex items-center gap-2.5 pl-3 ml-1" style={{ borderLeft: '1px solid var(--hair)' }}>
          <div className="text-right">
            <div className="text-[12px] font-medium leading-tight" style={{ color: 'var(--ink)' }}>Hoje · Qua, 14 mai</div>
            <div className="text-[10.5px] font-mono" style={{ color: 'var(--muted)' }}>2026 · semana 20</div>
          </div>
        </div>
      </div>
    </header>
  );
}
