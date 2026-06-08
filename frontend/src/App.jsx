// ═══════════════════════════════════════════════════════════════════════
// APP SHELL
// ═══════════════════════════════════════════════════════════════════════
function App() {
  const [usuario, setUsuario]         = useState(null);
  const [page, setPage]               = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme]             = useState(() => {
    try { return localStorage.getItem('cito-theme') || 'light'; }
    catch (e) { return 'light'; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('cito-theme', theme); } catch (e) {}
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  async function logout() {
    if (usuario?.sessao_id) {
      await db.rpc('fn_logout', { p_sessao_id: usuario.sessao_id });
    }
    setUsuario(null);
    setPage('dashboard');
    setSidebarOpen(false);
  }

  if (!usuario) {
    return (
      <LoginPage
        onLogin={setUsuario}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  const pageMeta = {
    dashboard:    { title: 'Visão geral',   subtitle: 'CITO · pré-diagnóstico SXF · 14 mai 2026' },
    agenda:       { title: 'Agenda',        subtitle: 'Suas consultas e janelas livres' },
    triagem:      { title: 'Nova triagem',  subtitle: 'Checklist da Síndrome do X Frágil' },
    pacientes:    { title: 'Pacientes',     subtitle: 'Prontuários ativos e histórico clínico' },
    atendimentos: { title: 'Atendimentos',  subtitle: 'Sessões e retornos do dia' },
    config:       { title: 'Configurações', subtitle: 'Preferências do módulo clínico' },
  };
  const meta = pageMeta[page] || pageMeta.dashboard;

  function nav(id) {
    setPage(id);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  return (
    <div className="min-h-screen paper-bg flex">
      <Sidebar
        active={page}
        onNav={nav}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={logout}
      />
      <div className="flex-1 flex flex-col lg:ml-[252px] min-w-0">
        <Topbar title={meta.title} subtitle={meta.subtitle} onMenu={() => setSidebarOpen(true)}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </Topbar>
        <main className="flex-1 p-6 lg:p-10">
          {page === 'dashboard'    && <DashboardPage onNav={nav} />}
          {page === 'agenda'       && <AgendaPage usuario={usuario} />}
          {page === 'triagem'      && <TriagemPage onNav={nav} usuario={usuario} />}
          {page === 'pacientes'    && <PacientesPage usuario={usuario} />}
          {page === 'config'       && <ConfigPage />}
        </main>
        <footer className="px-10 py-8 text-center" style={{ color: 'var(--subtle)' }}>
          <div className="flex justify-center mb-4" style={{ opacity: 0.45 }}>
            <img src="assets/cito-tight.png" alt="cito" className="cito-logo-img select-none"
              style={{ height: 32, width: 'auto' }} />
          </div>
          <div className="text-[11px] font-mono">
            CITO · ferramenta de pré-diagnóstico SXF · LGPD compliant · v2.1.4
          </div>
        </footer>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);