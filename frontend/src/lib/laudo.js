// ═══════════════════════════════════════════════════════════════════════
// CITO — Geração do laudo de triagem (PDF)
// Módulo compartilhado: a Triagem gera o laudo ao finalizar e a tela de
// Pacientes reimprime o mesmo laudo de uma triagem já registrada.
//
// Expõe:
//   window.gerarLaudoPDF(dados)  — desenha e baixa o PDF (idêntico nos dois fluxos)
//   window.LAUDO                 — catálogos (sintomas/histórico) p/ mapear dados do backend
//
// Encapsulado numa IIFE para não vazar nomes ao escopo global (evita colidir
// com as constantes da Triagem).
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

  function formatarData(str) {
    if (!str) return '—';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }
  function calcIdade(dataNasc) {
    if (!dataNasc) return '—';
    const [y, m, d] = dataNasc.split('-').map(Number);
    const hoje = new Date();
    let anos = hoje.getFullYear() - y;
    const meses = hoje.getMonth() + 1 - m;
    if (meses < 0 || (meses === 0 && hoje.getDate() < d)) anos--;
    return `${anos} anos`;
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
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  // ── Geração do PDF ────────────────────────────────────────────────────
  // dados = {
  //   nome, sexo ('M'|'F'), dataNasc ('YYYY-MM-DD'),
  //   acomp: { nome, telefone, email },
  //   respostas: { [sintomaId]: 1|0 },     // 1 = presente
  //   historico: { [histId]: bool },
  //   historicoOutros: string,
  //   scoreOverride: number|null,          // se nulo, calcula a partir das respostas
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
    const resultado  = encaminhar ? 'Encaminhar para teste genético (FMR1)' : 'Baixo risco — acompanhamento clínico';
    const W = 210, ML = 20, MR = 20, CW = W - ML - MR;
    let y = 0;

    // ── Cabeçalho institucional ──
    doc.setFillColor(13, 33, 55); // #0D2137 azul petróleo
    doc.rect(0, 0, W, 42, 'F');
    doc.setTextColor(255, 255, 255);
    try {const logo = await carregarImagem('assets/cito-logo.png');
    doc.addImage(logo,'PNG',ML,6,28,28);}
    catch (e) {console.log('Erro logo:', e);}
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 200, 220);
    doc.text('Ferramenta de Pré-diagnóstico — Síndrome do X Frágil', ML + 32, 22);
    doc.text('Sistema CITO · SUS · CAAE 47291 · LGPD compliant', ML + 32, 28);
    doc.setFontSize(8);
    doc.setTextColor(120, 160, 200);
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`,ML + 32,34);

    // Linha de título do documento (lado direito)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('LAUDO DE TRIAGEM SXF', W - MR, 18, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 200, 220);
    doc.text(`Score: ${score.toFixed(2)} · Limiar: ${limiar()}`, W - MR, 25, { align: 'right' });

    y = 52;

    // ── Faixa de resultado ──
    const resColor = encaminhar ? [13, 33, 55] : [40, 80, 60];
    doc.setFillColor(...resColor);
    doc.roundedRect(ML, y, CW, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(resultado.toUpperCase(), ML + CW / 2, y + 11, { align: 'center' });
    y += 26;

    // ── Seção dados do paciente ──
    function secHeader(titulo) {
      doc.setFillColor(235, 240, 248);
      doc.rect(ML, y, CW, 8, 'F');
      doc.setTextColor(13, 33, 55);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(titulo.toUpperCase(), ML + 3, y + 5.5);
      y += 12;
    }

    function campoGrid(pares) {
      const colW = CW / pares.length;
      pares.forEach(([label, valor], i) => {
        const x = ML + i * colW;
        doc.setTextColor(100, 110, 125);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(label, x, y);
        doc.setTextColor(20, 30, 50);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(String(valor || '—'), x, y + 5);
      });
      y += 13;
    }

    secHeader('Dados do paciente');
    campoGrid([['Nome completo', dados.nome], ['Sexo biológico', sexo === 'M' ? 'Masculino' : 'Feminino']]);
    campoGrid([['Data de nascimento', formatarData(dados.dataNasc)], ['Idade', calcIdade(dados.dataNasc)]]);

    y += 2;
    secHeader('Dados do acompanhante');
    campoGrid([['Nome', acomp.nome || '—'], ['Telefone', acomp.telefone || '—']]);
    if (acomp.email) campoGrid([['E-mail', acomp.email]]);

    y += 2;
    secHeader('Resultado do escore');

    // Barra de score visual
    doc.setFillColor(220, 228, 240);
    doc.roundedRect(ML, y, CW, 6, 2, 2, 'F');
    const barW = Math.min((score / 1) * CW, CW);
    doc.setFillColor(13, 33, 55);
    doc.roundedRect(ML, y, barW, 6, 2, 2, 'F');
    // marcador de limiar
    const limiarX = ML + limiar() * CW;
    doc.setDrawColor(200, 80, 80);
    doc.setLineWidth(0.4);
    doc.line(limiarX, y - 1, limiarX, y + 7);
    doc.setFontSize(7);
    doc.setTextColor(200, 80, 80);
    doc.text(`limiar ${limiar()}`, limiarX + 1, y - 2);
    y += 10;

    campoGrid([
      ['Score calculado', score.toFixed(4)],
      ['Limiar de corte', limiar()],
      ['Diferença', (score - limiar()).toFixed(4)],
    ]);

    doc.setFillColor(encaminhar ? 255 : 245, encaminhar ? 245 : 255, encaminhar ? 235 : 245);
    doc.roundedRect(ML, y, CW, 10, 2, 2, 'F');
    doc.setTextColor(encaminhar ? 120 : 40, encaminhar ? 80 : 100, encaminhar ? 20 : 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(resultado, ML + CW / 2, y + 6.5, { align: 'center' });
    y += 18;

    secHeader('Sintomas avaliados');
    const presentes = sintomasFiltrados.filter(s => respostas[s.id] === 1);
    const ausentes  = sintomasFiltrados.filter(s => respostas[s.id] !== 1);

    // Duas colunas: presentes | ausentes
    const colA = ML, colB = ML + CW / 2 + 2;
    let yA = y, yB = y;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 33, 55);
    doc.text('PRESENTES', colA, yA); yA += 5;
    doc.text('AUSENTES', colB, yB); yB += 5;

    presentes.forEach(s => {
      if (yA > 275) { doc.addPage(); yA = 20; yB = 20; }
      doc.setFillColor(13, 33, 55);
      doc.circle(colA + 2, yA - 1.5, 1.2, 'F');
      doc.setTextColor(20, 30, 50);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(s.label, colA + 6, yA);
      const peso = sexo === 'M' ? s.pesoM : s.pesoF;
      doc.setTextColor(100, 110, 130);
      doc.setFontSize(7.5);
      doc.text(`(${peso?.toFixed(2)})`, colA + CW / 2 - 4, yA, { align: 'right' });
      yA += 7;
    });

    ausentes.forEach(s => {
      if (yB > 275) { doc.addPage(); yB = 20; }
      doc.setFillColor(180, 190, 200);
      doc.circle(colB + 2, yB - 1.5, 1.2, 'F');
      doc.setTextColor(130, 140, 155);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(s.label, colB + 6, yB);
      yB += 7;
    });

    y = Math.max(yA, yB) + 6;

    // ── Histórico familiar ──
    const outros = (dados.historicoOutros || '').trim();
    const histMarcados = HISTORICO_FAMILIAR.filter(h => historico[h.id]);
    if (histMarcados.length > 0 || outros) {
      if (y > 240) { doc.addPage(); y = 20; }
      secHeader('Histórico familiar');
      histMarcados.forEach(h => {
        doc.setFillColor(13, 33, 55);
        doc.circle(ML + 2, y - 1.5, 1.2, 'F');
        doc.setTextColor(20, 30, 50);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(h.label, ML + 6, y);
        y += 7;
      });
      if (outros) {
        doc.setTextColor(80, 90, 100);
        doc.setFontSize(8);
        doc.text(`Outros: ${outros}`, ML, y);
        y += 7;
      }
    }

    // ── Rodapé ──
    const totalPages = doc.getNumberOfPages();
    for (let pg = 1; pg <= totalPages; pg++) {
      doc.setPage(pg);
      doc.setDrawColor(200, 210, 225);
      doc.setLineWidth(0.3);
      doc.line(ML, 285, W - MR, 285);
      doc.setTextColor(150, 160, 175);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('CITO · Síndrome do X Frágil · Este laudo não substitui avaliação médica especializada.', ML, 290);
      doc.text(`Página ${pg} de ${totalPages}`, W - MR, 290, { align: 'right' });
    }

    doc.save(`triagem-${(dados.nome || 'paciente').replaceAll(' ', '_')}-${new Date().toISOString().slice(0,10)}.pdf`);
  }

  window.gerarLaudoPDF = gerarLaudoPDF;
  window.LAUDO = { SINTOMAS, HISTORICO_FAMILIAR, SINTOMA_DESCRICAO };
})();
