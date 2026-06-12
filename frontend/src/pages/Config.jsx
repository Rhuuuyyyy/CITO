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
function RelatoriosSection({ usuario, onBack }) {
  const isAdmin = usuario?.tipo === 'admin';
  const [norm, setNorm]   = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [nomeF, setNomeF]           = useState('');     // busca por nome do paciente
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim]       = useState('');
  const [sexoF, setSexoF]           = useState('');     // '' | 'M' | 'F'
  const [medicoF, setMedicoF]       = useState('');     // '' = todos (admin)
  const [medicos, setMedicos]       = useState([]);     // lista p/ o filtro (admin)
  const [imprimindo, setImprimindo] = useState(null);   // avaliacao_id em impressão

  // Admin: carrega a lista de médicos para o seletor de filtro.
  useEffect(() => {
    if (!isAdmin) return;
    api.getUsuarios()
      .then((us) => setMedicos((us || []).filter((u) => u.ativo !== false)))
      .catch((err) => console.error('Erro ao carregar médicos:', err));
  }, [isAdmin]);

  // Recarrega sempre que um filtro muda (debounce leve nas datas).
  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      const params = {};
      if (dataInicio) params.data_inicio = dataInicio;
      if (dataFim)    params.data_fim    = dataFim;
      if (sexoF)      params.sexo        = sexoF;
      if (isAdmin && medicoF) params.medico_id = medicoF;
      api.getRelatorioAvaliacoes(params)
        .then((data) => {
          setNorm((data || []).map(a => {
            const score = Number(a.score_final);
            const sexo = a.sexo;
            return {
              score, sexo,
              avaliacaoId: a.avaliacao_id,
              nome: a.nome_masked || '—',
              medico: a.medico || '—',
              data: new Date(a.data_avaliacao),
              encaminha: score >= (sexo === 'M' ? 0.56 : 0.55),
            };
          }));
        })
        .catch((err) => console.error('Erro ao carregar relatórios:', err))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [dataInicio, dataFim, sexoF, medicoF, isAdmin]);

  function limparFiltros() {
    setNomeF(''); setDataInicio(''); setDataFim(''); setSexoF(''); setMedicoF('');
  }
  const temFiltro = nomeF || dataInicio || dataFim || sexoF || medicoF;

  // Gera/baixa o PDF do laudo de uma triagem (mesmo fluxo do prontuário).
  async function imprimirLaudo(avaliacaoId) {
    if (!avaliacaoId) return;
    setImprimindo(avaliacaoId);
    try {
      const av  = await api.getAvaliacaoDetalhe(avaliacaoId);
      const cat = (window.LAUDO && window.LAUDO.SINTOMA_DESCRICAO) || {};
      const respostas = {};
      (av.sintomas || []).forEach((s) => {
        const id = Object.keys(cat).find((k) => cat[k] === s.descricao);
        if (id) respostas[id] = s.presente ? 1 : 0;
      });
      const hist = av.historico_familiar || {};
      await window.gerarLaudoPDF({
        nome: av.paciente_nome,
        sexo: av.paciente_sexo,
        dataNasc: av.paciente_data_nascimento,
        dataAvaliacao: av.data_avaliacao,
        acomp: {
          nome: av.acompanhante_nome,
          relacao: av.acompanhante_relacao,
          telefone: av.acompanhante_telefone,
          email: av.acompanhante_email,
        },
        respostas,
        historico: hist,
        historicoOutros: hist.descricao_outros || '',
        scoreOverride: av.score_final,
      });
    } catch (err) {
      console.error('Erro ao reimprimir laudo:', err);
      alert('Não foi possível gerar o PDF: ' + (err.message || 'erro desconhecido'));
    } finally {
      setImprimindo(null);
    }
  }

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
  // Lista exibida: ao buscar por nome, mostra todas as triagens que casam
  // (até 50); sem busca, as 5 mais recentes.
  const nomeQ = nomeF.trim().toLowerCase();
  const ultimas = nomeQ
    ? norm.filter(a => (a.nome || '').toLowerCase().includes(nomeQ)).slice(0, 50)
    : norm.slice(0, 5);

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
          {isAdmin
            ? 'Atividade clínica de toda a equipe e indicadores de triagem'
            : 'Atividade clínica e indicadores de triagem'}
        </p>
      </div>

      {/* Filtros */}
      <div className="rounded-3xl p-4 card-shadow"
        style={{ background: 'var(--surface)', border: '1px solid var(--hair-soft)' }}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-[10.5px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>Paciente</label>
            <input type="text" value={nomeF} placeholder="Buscar por nome do paciente…"
              onChange={(e) => setNomeF(e.target.value)}
              className={`${inputCls} focus-ink`} style={inputStyle} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>De</label>
            <input type="date" value={dataInicio} max={dataFim || undefined}
              onChange={(e) => setDataInicio(e.target.value)}
              className={`${inputCls} focus-ink`} style={{ ...inputStyle, width: 'auto' }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>Até</label>
            <input type="date" value={dataFim} min={dataInicio || undefined}
              onChange={(e) => setDataFim(e.target.value)}
              className={`${inputCls} focus-ink`} style={{ ...inputStyle, width: 'auto' }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>Sexo</label>
            <select value={sexoF} onChange={(e) => setSexoF(e.target.value)}
              className={`${inputCls} focus-ink`} style={{ ...inputStyle, width: 'auto' }}>
              <option value="">Todos</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>
          {isAdmin && (
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>Médico</label>
              <select value={medicoF} onChange={(e) => setMedicoF(e.target.value)}
                className={`${inputCls} focus-ink`} style={{ ...inputStyle, width: 'auto' }}>
                <option value="">Todos os médicos</option>
                {medicos.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
          )}
          {temFiltro && (
            <button onClick={limparFiltros}
              className="text-[12.5px] font-medium lift px-3 py-2.5"
              style={{ color: 'var(--muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}>
              Limpar filtros
            </button>
          )}
        </div>
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
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--hair-soft)' }}>
          <h3 className="font-display text-[18px] leading-none">
            {nomeQ ? 'Triagens encontradas' : 'Últimas triagens'}
          </h3>
          {nomeQ && (
            <span className="text-[11.5px] font-mono" style={{ color: 'var(--muted)' }}>
              {ultimas.length} resultado{ultimas.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {loading && (
          <div className="px-6 py-6 text-[13px]" style={{ color: 'var(--muted)' }}>
            Carregando…
          </div>
        )}
        {!loading && ultimas.length === 0 && (
          <div className="px-6 py-6 text-[13px]" style={{ color: 'var(--muted)' }}>
            {temFiltro ? 'Nenhuma triagem encontrada para os filtros.' : 'Nenhuma triagem finalizada ainda.'}
          </div>
        )}
        {!loading && ultimas.map((t, i, arr) => (
          <div key={t.avaliacaoId ?? i} className="flex items-center justify-between px-6 py-4 gap-3"
            style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--hair-soft)' : 'none' }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                style={{ background: 'var(--paper-2)', color: 'var(--ink-2)', border: '1px solid var(--hair)' }}>
                {t.sexo}
              </div>
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium truncate">{t.nome}</div>
                <div className="text-[11px] font-mono truncate" style={{ color: 'var(--muted)' }}>
                  {t.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · {t.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {isAdmin && <> · {t.medico}</>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-right">
                <div className="font-mono num-tabular text-[14px] font-medium"
                  style={{ color: t.encaminha ? 'var(--ink)' : 'var(--subtle)' }}>
                  {t.score.toFixed(2)}
                </div>
                <div className="text-[10.5px]" style={{ color: 'var(--muted)' }}>
                  {t.encaminha ? 'Encaminhar' : 'Baixo risco'}
                </div>
              </div>
              <button onClick={() => imprimirLaudo(t.avaliacaoId)}
                disabled={imprimindo === t.avaliacaoId || !t.avaliacaoId}
                title="Imprimir laudo PDF"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium lift"
                style={{ border: '1px solid var(--hair)', color: 'var(--ink)',
                  opacity: imprimindo === t.avaliacaoId ? 0.6 : 1 }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--hair)'; }}>
                {imprimindo === t.avaliacaoId ? 'Gerando…' : <>{Icon.print} PDF</>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Seção de parâmetros do escore (consulta, somente leitura) ────────
function ParametrosScoreSection({ onBack }) {
  const PDF_URL = 'https://doi.org/10.1101/2025.10.21.25338500';
  const sintomas = (window.LAUDO && window.LAUDO.SINTOMAS) || [];
  const PARAM = {
    M: { limiar: 0.56, auc: 0.73, sens: 95, versao: 'ROMERO_2025_v1_M', label: 'Masculino', simbolo: '♂' },
    F: { limiar: 0.55, auc: 0.76, sens: 95, versao: 'ROMERO_2025_v1_F', label: 'Feminino',  simbolo: '♀' },
  };
  const somaM = sintomas.reduce((s, x) => s + (x.pesoM || 0), 0);
  const somaF = sintomas.reduce((s, x) => s + (x.pesoF || 0), 0);

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
        <h2 className="font-display text-[28px] leading-none">Parâmetros do escore</h2>
        <p className="text-[13px] mt-1.5" style={{ color: 'var(--muted)' }}>
          Peso de cada sintoma e limiares de corte do modelo de triagem
        </p>
      </div>

      {/* Referência científica */}
      <div className="rounded-3xl p-6 space-y-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--hair-soft)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-[10px] font-mono uppercase tracking-[0.14em] mb-2"
              style={{ color: 'var(--muted)' }}>Referência científica</div>
            <h3 className="font-display text-[17px] leading-snug mb-1">
              Síndrome do X Frágil no Brasil: Desenvolvimento e Validação de um Checklist Clínico para Triagem Populacional
            </h3>
            <p className="text-[12px] font-mono mt-1" style={{ color: 'var(--muted)' }}>
              Romero LM, Santos GCC, Schubert V, Scalabrin EE, Herai RH · Instituto Buko Kaesemodel (IBK) / PUCPR · medRxiv, 2025
            </p>
          </div>
          <button
            onClick={() => window.open(PDF_URL, '_blank')}
            className="flex-shrink-0 px-4 py-2 rounded-2xl text-[12.5px] font-medium lift"
            style={{ border: '1px solid var(--hair)', color: 'var(--ink-2)', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--hair)'; e.currentTarget.style.color = 'var(--ink-2)'; }}>
            Abrir artigo
          </button>
        </div>
        <div style={{ borderTop: '1px solid var(--hair-soft)', paddingTop: '1rem' }}>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            Estudo de corte com 419 indivíduos com mutação completa ou mosaicismo confirmados molecularmente no gene
            <em> FMR1</em> (364 do sexo masculino, 55 do sexo feminino), provenientes do banco de dados do Instituto Buko Kaesemodel.
            Foram avaliados 12 sinais físicos, cognitivos e comportamentais. Análises estatísticas combinadas com aprendizado de
            máquina (Random Forest, K-means) identificaram as características mais discriminativas por sexo.
          </p>
          <p className="text-[13px] leading-relaxed mt-3" style={{ color: 'var(--ink-2)' }}>
            O checklist pontuado, com pesos específicos por sexo, alcançou <strong>95% de sensibilidade</strong>, com áreas sob
            a curva ROC de <strong>0,73 (masculino)</strong> e <strong>0,76 (feminino)</strong>. Os principais preditores
            diferiram por sexo: deficiência intelectual e características faciais foram mais informativos no sexo masculino,
            enquanto dificuldades de aprendizagem foram mais relevantes no sexo feminino.
          </p>
          <p className="text-[13px] leading-relaxed mt-3" style={{ color: 'var(--ink-2)' }}>
            Esta é a maior coorte de SXF analisada no Brasil. O checklist validado representa uma ferramenta prática e de baixo
            custo para apoiar o diagnóstico precoce e orientar estratégias de saúde pública, reduzindo testes moleculares
            desnecessários ao priorizar os casos de maior risco.
          </p>
          <p className="text-[11.5px] font-mono mt-4" style={{ color: 'var(--subtle)' }}>
            DOI: 10.1101/2025.10.21.25338500 · preprint medRxiv (não revisado por pares) · licença CC-BY 4.0
          </p>
        </div>
      </div>

      {/* Limiares e métricas por sexo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {['M', 'F'].map((sx) => {
          const p = PARAM[sx];
          return (
            <div key={sx} className="rounded-3xl p-5 card-shadow"
              style={{ background: 'var(--surface)', border: '1px solid var(--hair-soft)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[14px]"
                  style={{ background: 'var(--ink)', color: 'var(--on-ink)' }}>{p.simbolo}</div>
                <div className="text-[13.5px] font-medium">{p.label}</div>
              </div>
              <div className="text-[10.5px] font-medium uppercase tracking-[0.14em] mb-1"
                style={{ color: 'var(--muted)' }}>Limiar de corte</div>
              <div className="font-display text-[34px] leading-none num-tabular mb-4"
                style={{ color: 'var(--ink)' }}>{p.limiar.toFixed(2)}</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { l: 'AUC', v: p.auc.toFixed(2) },
                  { l: 'Sensib.', v: `${p.sens}%` },
                  { l: 'Score máx.', v: (sx === 'M' ? somaM : somaF).toFixed(2) },
                ].map((m, i) => (
                  <div key={i} className="rounded-xl py-2"
                    style={{ background: 'var(--paper-2)', border: '1px solid var(--hair-soft)' }}>
                    <div className="text-[9.5px] uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>{m.l}</div>
                    <div className="font-mono num-tabular text-[14px] mt-0.5" style={{ color: 'var(--ink-2)' }}>{m.v}</div>
                  </div>
                ))}
              </div>
              <div className="text-[10.5px] font-mono mt-3" style={{ color: 'var(--subtle)' }}>
                versão {p.versao}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela de pesos por sintoma */}
      <div className="rounded-3xl overflow-hidden card-shadow"
        style={{ background: 'var(--surface)', border: '1px solid var(--hair-soft)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--hair-soft)' }}>
          <h3 className="font-display text-[18px] leading-none">Peso por sintoma</h3>
          <p className="text-[11.5px] mt-1" style={{ color: 'var(--muted)' }}>
            Pontos somados ao escore quando o sintoma está presente, conforme o sexo do paciente
          </p>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--hair-soft)', background: 'var(--paper-2)' }}>
              <th className="text-left font-medium px-6 py-2.5 text-[10.5px] uppercase tracking-[0.12em]"
                style={{ color: 'var(--muted)' }}>Sintoma</th>
              <th className="text-right font-medium px-4 py-2.5 text-[10.5px] uppercase tracking-[0.12em]"
                style={{ color: 'var(--muted)' }}>Peso ♂</th>
              <th className="text-right font-medium px-6 py-2.5 text-[10.5px] uppercase tracking-[0.12em]"
                style={{ color: 'var(--muted)' }}>Peso ♀</th>
            </tr>
          </thead>
          <tbody>
            {sintomas.map((s, i) => {
              const exclusivoM = s.pesoF === null || s.pesoF === undefined;
              const maiorF = !exclusivoM && s.pesoF > s.pesoM;
              return (
                <tr key={s.id} style={{ borderBottom: i < sintomas.length - 1 ? '1px solid var(--hair-soft)' : 'none' }}>
                  <td className="px-6 py-3">
                    {s.label}
                    {exclusivoM && (
                      <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--paper-2)', color: 'var(--subtle)', border: '1px solid var(--hair-soft)' }}>
                        exclusivo ♂
                      </span>
                    )}
                  </td>
                  <td className="text-right px-4 py-3 font-mono num-tabular"
                    style={{ color: maiorF ? 'var(--muted)' : 'var(--ink)', fontWeight: maiorF ? 400 : 500 }}>
                    {s.pesoM.toFixed(2)}
                  </td>
                  <td className="text-right px-6 py-3 font-mono num-tabular"
                    style={{ color: exclusivoM ? 'var(--subtle)' : (maiorF ? 'var(--ink)' : 'var(--muted)'), fontWeight: maiorF ? 500 : 400 }}>
                    {exclusivoM ? '—' : s.pesoF.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--hair)', background: 'var(--paper-2)' }}>
              <td className="px-6 py-3 text-[12px] font-medium uppercase tracking-[0.1em]"
                style={{ color: 'var(--muted)' }}>Score máximo</td>
              <td className="text-right px-4 py-3 font-mono num-tabular font-medium" style={{ color: 'var(--ink)' }}>{somaM.toFixed(2)}</td>
              <td className="text-right px-6 py-3 font-mono num-tabular font-medium" style={{ color: 'var(--ink)' }}>{somaF.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Nota explicativa */}
      <div className="rounded-2xl px-5 py-4 text-[12px] leading-relaxed"
        style={{ background: 'var(--paper-2)', border: '1px solid var(--hair-soft)', color: 'var(--muted)' }}>
        O escore é a soma dos pesos dos sintomas presentes, calculados conforme o sexo do paciente. Quando o
        escore atinge ou ultrapassa o limiar de corte, o sistema recomenda o encaminhamento para o teste
        genético (FMR1). Os valores são definidos cientificamente e mantidos no banco (modelo ROMERO 2025);
        esta tela é apenas para consulta.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL DE CONFIG
// ═══════════════════════════════════════════════════════════════════════
function ConfigPage({ usuario }) {
  const [sub, setSub] = useState(null); // null | 'relatorios' | 'modelos' | 'parametros'

  if (sub === 'relatorios') return <RelatoriosSection usuario={usuario} onBack={() => setSub(null)} />;
  if (sub === 'modelos') return <ModelosImpressosSection onBack={() => setSub(null)} />;
  if (sub === 'parametros') return <ParametrosScoreSection onBack={() => setSub(null)} />;

  const cards = [
    {
      icon: Icon.file,     tag: 'Análise',
      title: 'Relatórios e gráficos',
      desc:  'Visualize a atividade semanal, encaminhamentos e histórico de triagens.',
      action: () => setSub('relatorios'),
    },
    {
      icon: Icon.sparkle,  tag: 'Referência',
      title: 'Parâmetros do escore',
      desc:  'Consulte o peso de cada sintoma e os limiares de corte por sexo (♂ 0.56 · ♀ 0.55).',
      action: () => setSub('parametros'),
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
