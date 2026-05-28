// THEME TOGGLE — segmented switch
function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return (
    <button onClick={onToggle}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
      className="relative h-10 w-[68px] rounded-full lift flex items-center px-1"
      style={{ background: 'var(--surface)', border: '1px solid var(--hair)' }}>
      <span className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          left: isDark ? 'calc(100% - 36px)' : '4px',
          background: 'var(--ink)',
          color: 'var(--on-ink)',
          transition: 'left 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.2s',
        }}>
        {isDark ? Icon.moon : Icon.sun}
      </span>
      <span className="absolute left-2.5" style={{ color: 'var(--subtle)', visibility: isDark ? 'visible' : 'hidden' }}>{Icon.sun}</span>
      <span className="absolute right-2.5" style={{ color: 'var(--subtle)', visibility: isDark ? 'hidden' : 'visible' }}>{Icon.moon}</span>
    </button>
  );
}
