// ═══════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════
function LoginPage({ onLogin, theme, onToggleTheme }) {
  const [email, setEmail]       = useState('');
  const [senha, setSenha]       = useState('');
  const [showSenha, setShow]    = useState(false);
  const [erro, setErro]         = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');

    if (!email.trim() || !senha) {
      setErro('Preencha e-mail e senha para continuar.');
      return;
    }

    setLoading(true);
    try {
      const user = await api.login(email.trim().toLowerCase(), senha);
      onLogin(user);
    } catch (err) {
      console.error('Erro no login:', err);
      setErro(
        err.status === 400 || err.status === 401
          ? 'Credenciais inválidas. Verifique e tente novamente.'
          : 'Erro ao conectar ao servidor. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen paper-bg flex" style={{ background: 'var(--paper)' }}>

      <div className="hidden lg:flex flex-col justify-between flex-1 p-14 relative overflow-hidden"
        style={{ background: 'var(--ink)' }}>

        <div className="absolute -bottom-10 -left-10 pointer-events-none select-none"
          style={{ opacity: 0.06, width: 520 }}>
          <img src="assets/cito-tight.png" alt="" className="cito-logo-img on-ink w-full" />
        </div>

        <div className="relative">
          <img src="assets/cito-tight.png" alt="cito"
            className="cito-logo-img on-ink select-none"
            style={{ height: 52, width: 'auto' }} />
          <div className="mt-3 text-[11px] font-mono uppercase tracking-[0.18em]"
            style={{ color: 'var(--on-ink-35)' }}>
            Ferramenta de pré-diagnóstico SXF
          </div>
        </div>

        <div className="relative max-w-md">
          <TailFlourish width={56} height={20} color="rgba(255,255,255,0.15)" className="mb-5" />
          <p className="font-display text-[28px] leading-[1.2]" style={{ color: 'var(--on-ink)' }}>
            "O diagnóstico precoce é a ferramenta mais poderosa que temos."
          </p>
          <p className="text-[12px] font-mono mt-4" style={{ color: 'var(--on-ink-35)' }}>
            — Projeto de Extensão · Brasil
          </p>
        </div>

        <div className="relative flex gap-10">
          {[
            { val: '300k+',   label: 'Afetados no Brasil' },
            { val: '1:4.000', label: 'Nascimentos masc.' },
            { val: '<30%',    label: 'Diagnósticos conf.' },
          ].map((s) => (
            <div key={s.val}>
              <div className="font-display text-[32px] leading-none num-tabular"
                style={{ color: 'var(--on-ink)' }}>{s.val}</div>
              <div className="text-[11px] font-mono mt-1 uppercase tracking-[0.1em]"
                style={{ color: 'var(--on-ink-35)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center w-full lg:w-[480px] lg:flex-shrink-0 px-6 py-12 relative">

        <div className="absolute top-6 right-6">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>

        <div className="mb-10 lg:hidden flex flex-col items-center gap-2">
          <img src="assets/cito-tight.png" alt="cito"
            className="cito-logo-img select-none"
            style={{ height: 44, width: 'auto' }} />
          <div className="text-[10.5px] font-mono uppercase tracking-[0.16em]"
            style={{ color: 'var(--muted)' }}>
            Ferramenta de pré-diagnóstico SXF
          </div>
        </div>

        <div className="w-full max-w-[340px]">

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{ border: '1px solid var(--hair)', background: 'var(--surface)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ink)',
              animation: 'purrPulse 2.4s ease-in-out infinite' }} />
            <span className="text-[10.5px] font-mono uppercase tracking-[0.14em]"
              style={{ color: 'var(--muted)' }}>
              Acesso restrito · Médicos
            </span>
          </div>

          <h1 className="font-display text-[36px] leading-none mb-2"
            style={{ color: 'var(--ink)' }}>
            Bem-vindo
          </h1>
          <p className="text-[13.5px] mb-8" style={{ color: 'var(--muted)' }}>
            Insira suas credenciais para acessar o painel clínico.
          </p>

          {erro && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl mb-5"
              style={{ background: 'var(--rust-soft)', border: '1px solid var(--hair)' }}>
              <span style={{ color: 'var(--rust)', marginTop: 1 }}>{Icon.x}</span>
              <p className="text-[12.5px]" style={{ color: 'var(--rust)' }}>{erro}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            <Field label="E-mail profissional" required>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErro(''); }}
                placeholder="dr.nome@hospital.com"
                autoComplete="email"
                className={`${inputCls} focus-ink`}
                style={inputStyle}
              />
            </Field>

            <Field label="Senha" required>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setErro(''); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`${inputCls} focus-ink pr-20`}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShow(!showSenha)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-medium uppercase tracking-[0.08em] lift"
                  style={{ color: 'var(--subtle)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--subtle)'; }}>
                  {showSenha ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </Field>

            <div className="flex justify-end -mt-1">
              <button type="button"
                className="text-[12px] font-medium lift"
                style={{ color: 'var(--subtle)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--subtle)'; }}>
                Esqueceu a senha?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full text-[14px] font-medium lift disabled:opacity-40 disabled:pointer-events-none"
              style={{ background: 'var(--ink)', color: 'var(--on-ink)' }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--ink-2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ink)'; }}>
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round"/>
                  </svg>
                  Verificando…
                </>
              ) : (
                <>
                  {Icon.cat} Entrar no sistema
                </>
              )}
            </button>

          </form>

          <p className="text-center text-[11.5px] mt-8" style={{ color: 'var(--subtle)' }}>
            Acesso exclusivo para profissionais credenciados.{' '}
            <button className="underline lift"
              style={{ color: 'var(--muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}>
              Contato
            </button>
          </p>

          <div className="flex justify-center mt-10" style={{ opacity: 0.25 }}>
            <img src="assets/cito-tight.png" alt="cito"
              className="cito-logo-img select-none pointer-events-none"
              style={{ height: 24, width: 'auto' }} />
          </div>

        </div>
      </div>
    </div>
  );
}
