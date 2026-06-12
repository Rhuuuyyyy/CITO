// ═══════════════════════════════════════════════════════════════════════
// CITO — Geração do laudo de triagem (PDF) — estilo formulário clínico
// Módulo compartilhado: a Triagem gera o laudo ao finalizar e a tela de
// Pacientes reimprime o mesmo laudo de uma triagem já registrada.
//
// Layout: documento clínico em preto e branco puro (sem cor), no estilo de
// um prontuário/formulário do SUS — cabeçalho institucional com logo, campos
// delimitados por bordas, tabelas para sintomas e histórico, área de
// assinatura manual ao final.
//
// Expõe:
//   window.gerarLaudoPDF(dados)  — desenha e baixa o PDF (idêntico nos dois fluxos)
//   window.LAUDO                 — catálogos (sintomas/histórico) p/ mapear dados do backend
//
// Encapsulado numa IIFE para não vazar nomes ao escopo global.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  const SINTOMAS = [
    { id: "deficiencia_intelectual",    label: "Deficiência intelectual",      pesoM: 0.32, pesoF: 0.20 },
    { id: "face_alongada_orelhas",      label: "Face alongada / orelhas",      pesoM: 0.29, pesoF: 0.09 },
    { id: "macroorquidismo",            label: "Macroorquidismo",              pesoM: 0.26, pesoF: null  },
    { id: "hipermobilidade_articular",  label: "Hipermobilidade articular",    pesoM: 0.19, pesoF: 0.04 },
    { id: "dificuldades_aprendizagem",  label: "Dificuldades de aprendizagem", pesoM: 0.18, pesoF: 0.28 },
    { id: "deficit_atencao",            label: "Déficit de atenção",           pesoM: 0.17, pesoF: 0.12 },
    { id: "movimentos_repetitivos",     label: "Movimentos repetitivos",       pesoM: 0.17, pesoF: 0.05 },
    { id: "atraso_fala",                label: "Atraso na fala",               pesoM: 0.14, pesoF: 0.01 },
    { id: "hiperatividade",             label: "Hiperatividade",               pesoM: 0.12, pesoF: 0.04 },
    { id: "evita_contato_visual",       label: "Evita contato visual",         pesoM: 0.06, pesoF: 0.08 },
    { id: "evita_contato_fisico",       label: "Evita contato físico",         pesoM: 0.04, pesoF: 0.07 },
    { id: "agressividade",              label: "Agressividade",                pesoM: 0.01, pesoF: 0.02 },
  ];
  const LIMIAR_M = 0.56;
  const LIMIAR_F = 0.55;

  // Parâmetros do modelo científico vigente (parametro_triagem no banco).
  // Mantidos aqui apenas para rastreabilidade no laudo; a regra de score real
  // continua no banco (fn_calcular_score_triagem).
  const PARAMS = {
    M: { versao: 'ROMERO_2025_v1_M', auc: 0.73, sens: '95%' },
    F: { versao: 'ROMERO_2025_v1_F', auc: 0.76, sens: '95%' },
  };

  const HISTORICO_FAMILIAR = [
    { id: 'deficiencia_intelectual',   label: 'Deficiência intelectual' },
    { id: 'autismo_na_familia',        label: 'Autismo na família' },
    { id: 'epilepsia',                 label: 'Epilepsia' },
    { id: 'falencia_ovariana_precoce', label: 'Falência ovariana precoce' },
    { id: 'menopausa_precoce',         label: 'Menopausa precoce' },
    { id: 'infertilidade_masculina',   label: 'Infertilidade masculina' },
    { id: 'abortos_recorrentes',       label: 'Abortos recorrentes' },
    { id: 'tremor_ataxia_familiar',    label: 'Tremor / ataxia familiar (FXTAS)' },
  ];

  // Mapeia a descrição vinda do backend (tabela sintomas) → id curto do catálogo.
  const SINTOMA_DESCRICAO = {
    deficiencia_intelectual:   'Deficiência intelectual',
    face_alongada_orelhas:     'Face alongada / orelhas salientes',
    macroorquidismo:           'Macroorquidismo',
    hipermobilidade_articular: 'Hipermobilidade articular',
    dificuldades_aprendizagem: 'Dificuldades de aprendizagem',
    deficit_atencao:           'Déficit de atenção',
    movimentos_repetitivos:    'Movimentos repetitivos (estereotipias)',
    atraso_fala:               'Atraso na fala',
    hiperatividade:            'Hiperatividade',
    evita_contato_visual:      'Evita contato visual',
    evita_contato_fisico:      'Evita contato físico',
    agressividade:             'Agressividade',
  };

  // ── Helpers de formatação ──────────────────────────────────────────────
  function formatarData(str) {
    if (!str) return '—';
    const datePart = String(str).slice(0, 10);
    const [y, m, d] = datePart.split('-');
    if (!y || !m || !d) return '—';
    return `${d}/${m}/${y}`;
  }
  function calcIdade(dataNasc) {
    if (!dataNasc) return '—';
    const [y, m, d] = String(dataNasc).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return '—';
    const hoje = new Date();
    let anos = hoje.getFullYear() - y;
    const meses = hoje.getMonth() + 1 - m;
    if (meses < 0 || (meses === 0 && hoje.getDate() < d)) anos--;
    return `${anos} anos`;
  }
  function mascararCPF(cpf) {
    if (!cpf) return '—';
    const d = String(cpf).replace(/\D/g, '');
    if (d.length < 11) return String(cpf); // já mascarado ou incompleto: mostra como veio
    return `***.***.***-${d.slice(9, 11)}`;
  }

  function carregarImagem(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve({ data: canvas.toDataURL('image/png'), w: img.width, h: img.height });
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  // ── Geração do PDF ────────────────────────────────────────────────────
  // dados = {
  //   nome, sexo ('M'|'F'), dataNasc ('YYYY-MM-DD'),
  //   cpf,                                  // opcional (mascarado no laudo)
  //   diagnosticoPrevio,                    // opcional bool
  //   acomp: { nome, relacao, telefone, email },
  //   respostas: { [sintomaId]: 1|0 },      // 1 = presente
  //   historico: { [histId]: bool },
  //   historicoOutros: string,
  //   observacoes,                          // opcional string (vazio = caixa em branco)
  //   dataAvaliacao,                        // opcional 'YYYY-MM-DD' / ISO; default = hoje
  //   numProntuario,                        // opcional
  //   scoreOverride: number|null,           // se nulo, calcula a partir das respostas
  // }
  async function gerarLaudoPDF(dados) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const sexo = dados.sexo;
    const respostas = dados.respostas || {};
    const historico = dados.historico || {};
    const acomp = dados.acomp || {};
    const sintomasFiltrados = SINTOMAS.filter((s) => sexo === 'F' ? s.pesoF !== null : true);
    const limiar = () => (sexo === 'M' ? LIMIAR_M : LIMIAR_F);
    const param = PARAMS[sexo] || PARAMS.M;

    const calcScore = () => {
      const isM = sexo === 'M';
      let total = 0;
      sintomasFiltrados.forEach((s) => {
        const p = isM ? s.pesoM : s.pesoF;
        if (respostas[s.id] === 1 && p) total += p;
      });
      return parseFloat(total.toFixed(4));
    };
    const score = (dados.scoreOverride != null) ? Number(dados.scoreOverride) : calcScore();
    const encaminhar = score >= limiar();
    const resultado = encaminhar
      ? 'Encaminhar para teste genético (FMR1)'
      : 'Baixo risco — acompanhamento clínico';

    // ── Geometria da página ──
    const W = 210, ML = 15, MR = 15, CW = W - ML - MR; // CW = 180
    const TOP = 15;     // topo do conteúdo após nova página
    const BOT = 282;    // limite inferior do conteúdo (rodapé fica abaixo)
    let y = TOP;

    // Tons (preto e branco puro — só escala de cinza estrutural)
    const BLACK = [0, 0, 0];
    const LABEL = [70, 70, 70];   // rótulos de campo (cinza, ainda P&B)
    const FILL  = [232, 232, 232]; // faixa de seção / cabeçalho de tabela
    const setStroke = () => { doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3); };

    function ensure(h) {
      if (y + h > BOT) { doc.addPage(); y = TOP; }
    }

    // Caixa de seleção quadrada; marcada = X em diagonal.
    function checkbox(x, ytop, marked) {
      const s = 3.2;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(x, ytop, s, s, 'S');
      if (marked) {
        doc.setLineWidth(0.6);
        doc.line(x + 0.6, ytop + 0.6, x + s - 0.6, ytop + s - 0.6);
        doc.line(x + s - 0.6, ytop + 0.6, x + 0.6, ytop + s - 0.6);
        doc.setLineWidth(0.3);
      }
    }

    // Faixa de título de seção (fundo cinza, borda preta).
    function sectionLabel(titulo, minNext) {
      ensure(6.5 + (minNext != null ? minNext : 12));
      doc.setFillColor(...FILL);
      setStroke();
      doc.rect(ML, y, CW, 6.5, 'FD');
      doc.setTextColor(...BLACK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(titulo.toUpperCase(), ML + 2.5, y + 4.4);
      y += 6.5;
    }

    // Linha de campos delimitados: cells = [[label, valor], ...]
    function fieldRow(cells, rowH) {
      rowH = rowH || 11;
      ensure(rowH);
      const n = cells.length;
      const cw = CW / n;
      setStroke();
      for (let i = 0; i < n; i++) {
        const x = ML + i * cw;
        doc.rect(x, y, cw, rowH, 'S');
        const [label, value] = cells[i];
        doc.setTextColor(...LABEL);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.text(String(label).toUpperCase(), x + 2.5, y + 3.4);
        doc.setTextColor(...BLACK);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        const v = (value == null || value === '') ? '—' : String(value);
        doc.text(doc.splitTextToSize(v, cw - 5)[0], x + 2.5, y + 8.4);
      }
      y += rowH;
    }

    // ════════════════════════════════════════════════════════════════════
    // CABEÇALHO INSTITUCIONAL (página 1)
    // ════════════════════════════════════════════════════════════════════
    const hH = 26;
    const logoW = 30, rightW = 52;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(ML, y, CW, hH, 'S');
    doc.setLineWidth(0.3);
    doc.line(ML + logoW, y, ML + logoW, y + hH);
    doc.line(ML + CW - rightW, y, ML + CW - rightW, y + hH);

    // Logo (cito-tight.png — silhueta preta). Encaixa preservando proporção.
    try {
      const logo = await carregarImagem('assets/cito-tight.png');
      const cellW = logoW - 8, cellH = 12;
      const ratio = logo.w / logo.h;
      let dw = cellW, dh = cellW / ratio;
      if (dh > cellH) { dh = cellH; dw = cellH * ratio; }
      const lx = ML + (logoW - dw) / 2;
      const ly = y + (hH - dh) / 2;
      doc.addImage(logo.data, 'PNG', lx, ly, dw, dh);
    } catch (e) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(...BLACK);
      doc.text('cito', ML + logoW / 2, y + hH / 2 + 2, { align: 'center' });
    }

    // Bloco central (identidade)
    const cxL = ML + logoW + 4;
    doc.setTextColor(...BLACK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('SISTEMA CITO', cxL, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    doc.text('Ferramenta de Pré-diagnóstico — Síndrome do X Frágil (FXS)', cxL, y + 13.5);
    doc.setFontSize(7.5);
    doc.setTextColor(...LABEL);
    doc.text('SUS · CAAE 47291 · Documento em conformidade com a LGPD', cxL, y + 18.5);
    const agora = new Date();
    doc.setFontSize(7);
    doc.text(
      `Emitido em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      cxL, y + 23
    );

    // Bloco direito (identificação do documento)
    const rxL = ML + CW - rightW + 3;
    doc.setTextColor(...BLACK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('LAUDO DE TRIAGEM', rxL, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...LABEL);
    doc.text('Nº do prontuário', rxL, y + 11.5);
    doc.setTextColor(...BLACK);
    doc.setFontSize(8.5);
    doc.text(dados.numProntuario ? String(dados.numProntuario) : '____________', rxL, y + 15.5);
    doc.setTextColor(...LABEL);
    doc.setFontSize(7.5);
    doc.text('Data da avaliação', rxL, y + 20.5);
    doc.setTextColor(...BLACK);
    doc.setFontSize(8.5);
    doc.text(formatarData(dados.dataAvaliacao) === '—'
      ? agora.toLocaleDateString('pt-BR')
      : formatarData(dados.dataAvaliacao), rxL, y + 24.5);

    y += hH + 5;

    // ════════════════════════════════════════════════════════════════════
    // IDENTIFICAÇÃO DO PACIENTE
    // ════════════════════════════════════════════════════════════════════
    sectionLabel('Identificação do paciente', 35);
    fieldRow([['Nome completo do paciente', dados.nome]]);
    fieldRow([
      ['Data de nascimento', formatarData(dados.dataNasc)],
      ['Idade', calcIdade(dados.dataNasc)],
      ['Sexo biológico', sexo === 'M' ? 'Masculino' : (sexo === 'F' ? 'Feminino' : '—')],
    ]);
    fieldRow([
      ['CPF', mascararCPF(dados.cpf)],
      ['Diagnóstico prévio de FXS', dados.diagnosticoPrevio == null ? '—' : (dados.diagnosticoPrevio ? 'Sim' : 'Não')],
    ]);

    // ════════════════════════════════════════════════════════════════════
    // ACOMPANHANTE / RESPONSÁVEL
    // ════════════════════════════════════════════════════════════════════
    y += 2;
    sectionLabel('Acompanhante / responsável', 24);
    fieldRow([
      ['Nome do acompanhante', acomp.nome || '—'],
      ['Relação com o paciente', acomp.relacao || '—'],
    ]);
    fieldRow([
      ['Telefone', acomp.telefone || '—'],
      ['E-mail', acomp.email || '—'],
    ]);

    // ════════════════════════════════════════════════════════════════════
    // RESULTADO DA TRIAGEM (tabela numérica + conduta)
    // ════════════════════════════════════════════════════════════════════
    y += 2;
    sectionLabel('Resultado da triagem', 36);
    fieldRow([
      ['Score calculado', score.toFixed(4)],
      ['Limiar de corte', limiar().toFixed(2)],
      ['Diferença', (score - limiar()).toFixed(4)],
    ]);
    fieldRow([
      ['Versão do parâmetro', param.versao],
      ['AUC do modelo', param.auc.toFixed(2)],
      ['Sensibilidade', param.sens],
    ]);

    // Conduta recomendada — duas opções com checkbox (a marcada reflete o score)
    ensure(14);
    setStroke();
    doc.rect(ML, y, CW, 14, 'S');
    doc.setTextColor(...LABEL);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('CONDUTA RECOMENDADA', ML + 2.5, y + 3.6);
    checkbox(ML + 3, y + 6.6, encaminhar);
    doc.setTextColor(...BLACK);
    doc.setFont('helvetica', encaminhar ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.text('Encaminhar para teste genético (FMR1)', ML + 9, y + 9.4);
    checkbox(ML + CW / 2 + 3, y + 6.6, !encaminhar);
    doc.setFont('helvetica', !encaminhar ? 'bold' : 'normal');
    doc.text('Baixo risco — acompanhamento clínico', ML + CW / 2 + 9, y + 9.4);
    y += 14;

    // ════════════════════════════════════════════════════════════════════
    // SINTOMAS AVALIADOS (tabela)
    // ════════════════════════════════════════════════════════════════════
    y += 2;
    const c1 = 112, c2 = 23, c3 = 45; // Sintoma | Peso | Resultado
    function sintomasHeader() {
      const hh = 6.5;
      doc.setFillColor(...FILL);
      setStroke();
      doc.rect(ML, y, c1, hh, 'FD');
      doc.rect(ML + c1, y, c2, hh, 'FD');
      doc.rect(ML + c1 + c2, y, c3, hh, 'FD');
      doc.setTextColor(...BLACK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('SINTOMA', ML + 2.5, y + 4.3);
      doc.text('PESO', ML + c1 + c2 / 2, y + 4.3, { align: 'center' });
      doc.text('RESULTADO', ML + c1 + c2 + 3, y + 4.3);
      y += hh;
    }
    sectionLabel('Sintomas avaliados', 6.5 + 6.5 + 6.5);
    sintomasHeader();
    const rh = 6.5;
    sintomasFiltrados.forEach((s) => {
      if (y + rh > BOT) { doc.addPage(); y = TOP; sintomasHeader(); }
      setStroke();
      doc.rect(ML, y, c1, rh, 'S');
      doc.rect(ML + c1, y, c2, rh, 'S');
      doc.rect(ML + c1 + c2, y, c3, rh, 'S');
      const presente = respostas[s.id] === 1;
      const peso = sexo === 'M' ? s.pesoM : s.pesoF;
      doc.setTextColor(...BLACK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(s.label, ML + 2.5, y + 4.4);
      doc.text(peso != null ? peso.toFixed(2) : '—', ML + c1 + c2 / 2, y + 4.4, { align: 'center' });
      checkbox(ML + c1 + c2 + 3, y + 1.7, presente);
      doc.setFontSize(8);
      doc.setFont('helvetica', presente ? 'bold' : 'normal');
      doc.text(presente ? 'Presente' : 'Ausente', ML + c1 + c2 + 9, y + 4.4);
      y += rh;
    });

    // ════════════════════════════════════════════════════════════════════
    // HISTÓRICO FAMILIAR (sempre visível, todos os achados)
    // ════════════════════════════════════════════════════════════════════
    y += 2;
    sectionLabel('Histórico familiar', 7 + 7 + 10);
    const half = CW / 2;
    const hrh = 7;
    for (let i = 0; i < HISTORICO_FAMILIAR.length; i += 2) {
      if (y + hrh > BOT) { doc.addPage(); y = TOP; }
      for (let j = 0; j < 2; j++) {
        const x = ML + j * half;
        setStroke();
        doc.rect(x, y, half, hrh, 'S');
        const idx = i + j;
        if (idx >= HISTORICO_FAMILIAR.length) continue;
        const h = HISTORICO_FAMILIAR[idx];
        const marked = !!historico[h.id];
        checkbox(x + 2.5, y + 1.9, marked);
        doc.setTextColor(...BLACK);
        doc.setFont('helvetica', marked ? 'bold' : 'normal');
        doc.setFontSize(8.3);
        doc.text(h.label, x + 8.5, y + 4.7);
      }
      y += hrh;
    }
    // Outros achados familiares (texto livre)
    ensure(11);
    setStroke();
    doc.rect(ML, y, CW, 11, 'S');
    doc.setTextColor(...LABEL);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text('OUTROS ACHADOS FAMILIARES', ML + 2.5, y + 3.4);
    doc.setTextColor(...BLACK);
    doc.setFontSize(9);
    const outros = (dados.historicoOutros || '').trim();
    doc.text(doc.splitTextToSize(outros || '—', CW - 6), ML + 2.5, y + 8);
    y += 11;

    // ════════════════════════════════════════════════════════════════════
    // OBSERVAÇÕES CLÍNICAS (caixa; vazia se não preenchida)
    // ════════════════════════════════════════════════════════════════════
    y += 2;
    sectionLabel('Observações clínicas', 22);
    const obsH = 22;
    ensure(obsH);
    setStroke();
    doc.rect(ML, y, CW, obsH, 'S');
    const obs = (dados.observacoes || '').trim();
    if (obs) {
      doc.setTextColor(...BLACK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(doc.splitTextToSize(obs, CW - 6), ML + 3, y + 5.5);
    }
    y += obsH;

    // ════════════════════════════════════════════════════════════════════
    // RESPONSÁVEL PELA TRIAGEM (preenchimento / assinatura manual)
    // ════════════════════════════════════════════════════════════════════
    y += 2;
    sectionLabel('Responsável pela triagem', 32);
    const sigH = 32;
    ensure(sigH);
    setStroke();
    doc.rect(ML, y, CW, sigH, 'S');
    doc.setTextColor(...BLACK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Médico(a): ______________________________________________', ML + 6, y + 9);
    doc.text('CRM: ___________________', ML + 6, y + 15.5);
    doc.text('Data: ______/______/__________', ML + CW - 6, y + 9, { align: 'right' });
    // Linha de assinatura centralizada
    const cx = ML + CW / 2;
    const lineY = y + sigH - 8;
    doc.setLineWidth(0.4);
    doc.setDrawColor(0, 0, 0);
    doc.line(cx - 55, lineY, cx + 55, lineY);
    doc.setFontSize(7.5);
    doc.setTextColor(...LABEL);
    doc.text('Assinatura e carimbo do profissional responsável', cx, lineY + 4.5, { align: 'center' });
    y += sigH;

    // ════════════════════════════════════════════════════════════════════
    // RODAPÉ (todas as páginas)
    // ════════════════════════════════════════════════════════════════════
    const totalPages = doc.getNumberOfPages();
    for (let pg = 1; pg <= totalPages; pg++) {
      doc.setPage(pg);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(ML, 288, W - MR, 288);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('CITO · Síndrome do X Frágil · Documento de triagem — não substitui avaliação médica especializada.', ML, 292);
      doc.text(`Página ${pg} de ${totalPages}`, W - MR, 292, { align: 'right' });
    }

    doc.save(`triagem-${(dados.nome || 'paciente').replaceAll(' ', '_')}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  window.gerarLaudoPDF = gerarLaudoPDF;
  window.LAUDO = { SINTOMAS, HISTORICO_FAMILIAR, SINTOMA_DESCRICAO };
})();
