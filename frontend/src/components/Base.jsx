// ═══════════════════════════════════════════════════════════════════════
// BASE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════
function Pill({ tone = 'neutral', children, dot = true }) {
  const tones = {
    neutral: { bg: 'var(--paper-2)',    fg: 'var(--ink-2)',  dot: 'var(--muted)', border: 'transparent' },
    honey:   { bg: 'var(--ink)',        fg: 'var(--on-ink)', dot: 'var(--on-ink)', border: 'transparent' },
    sage:    { bg: 'var(--surface)',    fg: 'var(--ink)',    dot: 'var(--ink)',    border: 'var(--ink)' },
    rust:    { bg: 'var(--surface)',    fg: 'var(--ink)',    dot: 'var(--ink)',    border: 'var(--hair)' },
    ink:     { bg: 'var(--ink)',        fg: 'var(--on-ink)', dot: 'var(--on-ink)', border: 'transparent' },
  };
  const t = tones[tone];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-medium tracking-tight"
      style={{ background: t.bg, color: t.fg, border: `1px solid ${t.border}` }}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.dot }} />}
      {children}
    </span>
  );
}

function BtnPrimary({ children, onClick, type = 'button', className = '', disabled }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium lift disabled:opacity-40 disabled:pointer-events-none ${className}`}
      style={{ background: 'var(--ink)', color: 'var(--on-ink)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ink-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ink)'; }}>
      {children}
    </button>
  );
}

function BtnGhost({ children, onClick, className = '' }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium lift ${className}`}
      style={{ background: 'transparent', color: 'var(--ink)', border: '1px solid var(--hair)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-tint)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
      {children}
    </button>
  );
}

function BtnHoney({ children, onClick, className = '' }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium lift ${className}`}
      style={{ background: 'var(--honey)', color: 'var(--on-ink)' }}>
      {children}
    </button>
  );
}

const inputCls = "w-full rounded-2xl px-4 py-3 text-[14px] outline-none focus-ink lift";
const inputStyle = { border: '1px solid var(--hair)', color: 'var(--ink)', background: 'var(--surface)' };

function Field({ label, required, children, error }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-medium uppercase tracking-[0.12em] mb-1.5"
        style={{ color: 'var(--muted)' }}>
        {label} {required && <span style={{ color: 'var(--rust)' }}>*</span>}
      </label>
      {children}
      {error && <p className="text-[12px] mt-1.5" style={{ color: 'var(--rust)' }}>{error}</p>}
    </div>
  );
}

function Card({ children, className = '', interactive = false, style = {} }) {
  return (
    <div className={`rounded-3xl card-shadow ${interactive ? 'card-shadow-hover cursor-pointer lift' : ''} ${className}`}
      style={{ background: 'var(--surface)', border: '1px solid var(--hair-soft)', ...style }}>
      {children}
    </div>
  );
}
