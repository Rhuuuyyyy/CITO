# SUPER-PROMPT PARA CLAUDE DESIGN — APRESENTAÇÃO ACADÊMICA CITO

---

## INSTRUÇÕES GERAIS PARA O CLAUDE DESIGN

Você é um designer de apresentações acadêmicas especializado em UX clínico e comunicação científica. Sua tarefa é criar uma apresentação completa de 8 a 10 slides, pronta para ser apresentada em um contexto acadêmico (banca de projeto, seminário científico ou congresso de saúde). O tom é informativo, empático e rigorosamente não-comercial.

---

## ASSETS VISUAIS DISPONÍVEIS

Os seguintes arquivos de imagem devem ser usados na apresentação. Incorpore-os conforme as instruções de cada slide:

| Arquivo | Uso recomendado |
|---|---|
| `assets/cito-logo.png` | Versão primária do wordmark — use em slides de abertura e rodapés |
| `assets/cito-tight.png` | Versão compacta do wordmark — use como marca d'água (opacity 6–12%) em fundos escuros |
| `assets/cat-1.png` | Primeira silhueta felina (da fileira de quatro) |
| `assets/cat-2.png` | Segunda silhueta felina |
| `assets/cat-3.png` | Terceira silhueta felina |
| `assets/cat-4.png` | Quarta silhueta felina — use individualmente como ornamento ou em fileira completa (cat-1 → cat-4) como elemento decorativo de rodapé ou transição |

**Regra de uso dos assets:** As silhuetas felinas (`cat-1` a `cat-4`) devem aparecer no máximo em 3 slides, sempre em escala reduzida ou com opacidade baixa (10–20%). O `cito-tight.png` como marca d'água só nos slides de fundo preto. O `cito-logo.png` aparece com visibilidade plena apenas no Slide 1.

---

## ESPECIFICAÇÕES TIPOGRÁFICAS

**Fontes a usar (todas gratuitas via Google Fonts):**

| Papel | Fonte | Variante | Onde buscar |
|---|---|---|---|
| Títulos de slide | **Cormorant Garamond** | SemiBold 600 | fonts.google.com/specimen/Cormorant+Garamond |
| Subtítulos e labels | **Inter** | Medium 500 e Regular 400 | fonts.google.com/specimen/Inter |
| Scores, thresholds e dados numéricos | **JetBrains Mono** | Regular 400 | fonts.google.com/specimen/JetBrains+Mono |
| Citações e destaques de fala | **Cormorant Garamond** | Italic 400 | (mesma fonte, variante itálica) |

**Hierarquia de tamanhos (referência para 16:9 widescreen):**
- Título principal do slide: 48–56pt (Cormorant Garamond SemiBold)
- Subtítulo / lead: 20–24pt (Inter Regular)
- Corpo de texto: 16–18pt (Inter Regular)
- Labels e rótulos: 11–13pt (Inter Medium, uppercase, letter-spacing 0.12em)
- Dados numéricos em destaque: 48–64pt (JetBrains Mono)
- Rodapé e metadados: 10–11pt (Inter Regular, cor cinza médio)

---

## ESPECIFICAÇÕES DE DESIGN

**Estética geral:** Minimalista, clínica, Preto & Branco com espaço em branco generoso.

**Paleta:**
- Fundo padrão: Branco puro `#FFFFFF` ou off-white `#FAFAF8`
- Texto principal: Carvão `#1A1A1A`
- Elementos secundários e rótulos: Cinza médio `#888884`
- Separadores e bordas: Cinza ultra-claro `#E8E5E0`
- Slides de impacto: Fundo preto `#0D0D0D`, texto branco `#FFFFFF`
- **Proibido:** cores vibrantes, gradientes coloridos, azuis clínicos, vermelho alarmista

**Composição:**
- Margens generosas: mínimo 10% de padding em todas as bordas
- Separadores horizontais finos (1px, `#E8E5E0`) no lugar de caixas coloridas
- Número do slide: canto superior esquerdo, 11pt, Inter Regular, cinza `#C0BDB8`
- Rodapé padrão (todos os slides exceto o 1 e os de fundo preto): "CITO · Sistema de Triagem SXF · CAAE 47291" em 10pt, cinza claro, alinhado à direita

**Slides de impacto (fundos pretos — slides 3 e 8):**
- Fundo: `#0D0D0D`
- Todo texto: `#FFFFFF` ou `rgba(255,255,255,0.55)` para elementos secundários
- Usar `assets/cito-tight.png` como marca d'água no canto inferior direito, `opacity: 7%`

**Formato:** 16:9 widescreen. Máximo de 60 palavras de corpo de texto por slide.

---

## ROTEIRO SLIDE A SLIDE

---

### SLIDE 1 — ABERTURA / IDENTIDADE VISUAL (≈ 30 seg)

**Layout:**
- Fundo branco `#FAFAF8`
- Centro-esquerdo: `assets/cito-logo.png` em altura de 72–80px
- Abaixo do logo, em Inter Regular 13pt, cinza médio: `Sistema de Triagem · Síndrome do X Frágil · SUS · CAAE 47291`
- Canto inferior direito: fileira completa das quatro silhuetas (`cat-1.png` → `cat-2.png` → `cat-3.png` → `cat-4.png`) em altura 28px, opacidade 35%, alinhadas pela base
- Rodapé esquerdo: instituição e data da apresentação

**Fala do apresentador:**
> "Este é o CITO — uma ferramenta de pré-diagnóstico para a Síndrome do X Frágil, desenvolvida para uso clínico no SUS. O nome não é arbitrário: CITO vem de citosina, a base nitrogenada que está no centro do mecanismo molecular desta síndrome — e esse vínculo entre biologia e prática clínica é exatamente o que esta ferramenta materializa. A identidade visual usa silhuetas felinas: curvas fluidas que remetem à precisão, ao cuidado, e à natureza familiar do público atendido."

---

### SLIDE 2 — O PROBLEMA: INVISIBILIDADE DIAGNÓSTICA (≈ 60 seg)

**Layout:**
- Fundo branco
- Divisão em dois blocos por uma linha vertical fina (`#E8E5E0`, 1px)
- **Bloco esquerdo:** dado de impacto em JetBrains Mono 56pt, preto — `1:4.000 ♂` e `1:8.000 ♀` em linhas separadas. Abaixo, em Inter Regular 13pt, cinza médio: "prevalência estimada da SXF"
- **Bloco direito:** três linhas de texto em Inter Regular 17pt, alinhadas à esquerda, com espaço generoso entre elas:
  - "Causa hereditária mais comum de deficiência intelectual"
  - "Diagnóstico tardio: média de 3–5 anos após primeiros sintomas"
  - "Ausência de triagem estruturada no fluxo primário do SUS"

**Fala do apresentador:**
> "A Síndrome do X Frágil é a causa hereditária mais comum de deficiência intelectual, com prevalência de 1 para cada 4.000 homens e 1 para cada 8.000 mulheres. Apesar disso, o diagnóstico tardio é a norma — não a exceção. Muitas famílias percorrem anos de consultas sem receber orientação para o teste genético confirmatório. O problema não é a ausência de conhecimento científico; é a ausência de uma ferramenta acessível que conecte os sinais clínicos observáveis ao encaminhamento correto."

---

### SLIDE 3 — O CONCEITO: CITO E A BIOLOGIA DA SXF (≈ 90 seg) [SLIDE DE IMPACTO — FUNDO PRETO]

**Layout:**
- Fundo preto `#0D0D0D`, todo texto branco
- `assets/cito-tight.png` no canto inferior direito, `opacity: 7%`, altura 180px
- Diagrama esquemático horizontal, linhas finas brancas sobre preto, no terço superior do slide:
  - Linha representando o gene FMR1 no cromossomo X
  - Região anotada: `5' UTR — Repetição CGG expandida (> 200×)` em JetBrains Mono 12pt
  - Ícone de cadeado ou símbolo ⊘ sobre a região: `Hipermetilação de citosinas (CpG)` em Inter 12pt
  - Seta bloqueada (→ com X): `Transcrição FMR1 silenciada`
  - Ícone de espinho dendrítico simples (estilizado, traço fino): `FMRP ausente → espinhos imaturos`
- Abaixo do diagrama, uma única `cat-4.png` no canto inferior esquerdo, `opacity: 15%`, altura 56px

**Fala do apresentador:**
> "Antes de mostrar a ferramenta, é necessário entender o mecanismo que a justifica. Na mutação completa da SXF, a expansão do trinucleotídeo CGG na região 5' não-traduzida do gene FMR1 — portanto fora do quadro codificante — desencadeia hipermetilação das citosinas nos dinucleotídeos CpG do promotor e da região flanqueante. Esse silenciamento epigenético abole a transcrição do FMR1. O resultado é a ausência de FMRP, uma proteína de ligação ao RNA essencial para a regulação da síntese proteica nas sinapses. Sem FMRP, os espinhos dendríticos permanecem em morfologia imatura — finos, filamentosos — e a plasticidade sináptica é comprometida. É aqui que as alterações cognitivas e comportamentais da síndrome têm sua raiz celular. O nome CITO homenageia a citosina: o ponto molecular onde o silêncio começa."

---

### SLIDE 4 — PÚBLICO-ALVO E CONTEXTO DE USO (≈ 60 seg)

**Layout:**
- Fundo branco
- Três colunas iguais, separadas por linhas verticais finas `#E8E5E0`
- Cada coluna: ícone de traço fino (SVG, 24px) no topo + título em Cormorant Garamond SemiBold 22pt + parágrafo em Inter Regular 15pt
  - **Coluna 1:** ícone estetoscópio · "Profissional de saúde" · "Médicos, pediatras e equipes multidisciplinares no SUS que realizam triagem clínica"
  - **Coluna 2:** ícone família · "Pacientes e famílias" · "Crianças e jovens com suspeita clínica; famílias em percurso diagnóstico prolongado"
  - **Coluna 3:** ícone checklist · "Contexto SUS" · "Ferramenta para o fluxo real de triagem: do sintoma observável ao encaminhamento genético"
- Rodapé em linha horizontal com três badges minimalistas (borda 1px `#E8E5E0`, padding interno): `CAAE 47291` · `LGPD` · `Pré-diagnóstico`

**Fala do apresentador:**
> "A ferramenta foi desenhada para o profissional de saúde dentro do SUS — não como um produto, mas como um instrumento clínico de apoio à decisão. Do outro lado da tela estão pacientes, em sua maioria crianças, e suas famílias: pessoas que frequentemente chegam à consulta após anos de peregrinação sem diagnóstico. A ferramenta existe para reduzir esse percurso — qualificando o olhar clínico e direcionando o encaminhamento certo."

---

### SLIDE 5 — VISÃO GERAL DO ARTEFATO: A JORNADA DO USUÁRIO (≈ 60 seg)

**Layout:**
- Fundo branco
- Diagrama de fluxo horizontal estilo wireflow (ícones de tela + setas finas):
  `[Login]` → `[Dashboard]` → bifurcação em quatro ramos: `[Triagem]` · `[Pacientes]` · `[Agenda]` · `[Relatórios]`
- Cada nó: caixa de bordas arredondadas (border-radius 8px), borda 1px `#C0BDB8`, fundo branco, rótulo em Inter Medium 13pt
- Nó `[Triagem]` levemente maior e em borda `#1A1A1A` 1.5px para indicar fluxo primário
- Abaixo do diagrama, linha separadora fina e um texto em Inter Regular 13pt, cinza médio:
  `"Dados pessoais cifrados em repouso e mascarados na interface — conformidade LGPD"`

**Fala do apresentador:**
> "A jornada começa pelo login, que autentica o profissional e abre uma sessão rastreada. O Dashboard é o ponto de controle: triagens do dia, atividade dos últimos sete dias, taxa de encaminhamento e pacientes ativos, tudo em tempo real. A partir daí, o profissional pode iniciar uma triagem, acessar prontuários, gerenciar a agenda ou consultar relatórios. O fluxo de triagem é o caminho principal — é onde a ferramenta entrega seu valor clínico central."

---

### SLIDE 6 — O FLUXO CENTRAL: TRIAGEM EM 5 ETAPAS (≈ 90 seg)

**Layout:**
- Fundo branco
- Topo: stepper horizontal com 5 nós conectados por linhas finas `#E8E5E0`:
  `① Paciente` · `② Acompanhante` · `③ Questionário` · `④ Histórico` · `⑤ Revisão`
  (nós em círculo 32px, número central em JetBrains Mono, rótulo abaixo em Inter 11pt uppercase)
- Abaixo do stepper: cinco blocos em coluna compacta (ou duas colunas 2+3), cada um com:
  - Número da etapa em JetBrains Mono 11pt, cinza médio
  - Título em Inter Medium 15pt
  - Descrição em Inter Regular 13pt, cinza médio — uma linha
- Canto inferior direito: dois dados em JetBrains Mono 28pt, preto:
  `AUC 0,73 ♂` e `AUC 0,76 ♀` com rótulo em Inter 11pt uppercase: "MODELO ESTATÍSTICO VALIDADO"

**Descrições das etapas para o layout:**
1. **Paciente** — Busca por autocomplete; dados do cadastro são pré-carregados
2. **Acompanhante** — Vínculo com responsável presente (campo opcional)
3. **Questionário** — 12 sintomas com pesos calibrados por sexo; barra de progresso em tempo real
4. **Histórico familiar** — 8 condições em chips toggle; campo de texto livre para observações
5. **Revisão** — Score calculado vs. limiar; resultado preliminar antes de gerar o laudo

**Fala do apresentador:**
> "O coração do CITO é o assistente de triagem em cinco etapas. Primeiro, o profissional localiza o paciente por busca com autocomplete — os dados aparecem pré-preenchidos. Na etapa do questionário — a mais crítica — doze sintomas com pesos estatísticos calibrados por sexo são avaliados com Sim ou Não; uma barra de progresso acompanha em tempo real. O histórico familiar captura condições como falência ovariana precoce, tremor/ataxia familiar e deficiência intelectual na linhagem — marcadores que ampliam a suspeita clínica. Na revisão final, o score calculado é confrontado com o limiar validado para o sexo do paciente. O modelo tem AUC de 0,73 para meninos e 0,76 para meninas."

---

### SLIDE 7 — LAUDO E DECISÃO CLÍNICA (≈ 60 seg)

**Layout:**
- Fundo branco
- Divisão em dois painéis por linha vertical 1px `#E8E5E0`
- **Painel esquerdo** (fundo levemente acinzentado `#F5F4F1`, cantos arredondados 12px):
  - Representação esquemática do modal de resultado:
    - Rótulo em Inter 11pt uppercase, cinza: "SCORE CALCULADO"
    - Valor numérico em JetBrains Mono 52pt: `0.73` (exemplo)
    - Barra horizontal (0 → 1) com marcador vertical no limiar (`♂ 0,56`)
    - Dois estados em pills arredondadas:
      - Pill preenchida preta: `Encaminhar para teste genético`
      - Pill com borda: `Baixo risco — acompanhamento`
- **Painel direito:** três itens em lista simples, Inter Regular 16pt:
  - `Limiares sexo-específicos: ♂ ≥ 0,56 · ♀ ≥ 0,55`
  - `Laudo PDF gerado automaticamente ao finalizar`
  - `Triagem registrada no histórico do paciente`
  - `Encaminhamento FMR1 documentado quando indicado`

**Fala do apresentador:**
> "Ao concluir a revisão, o profissional gera o laudo. Um modal apresenta o score frente ao limiar calibrado para o sexo: atingindo ou superando o limiar, a recomendação é encaminhamento para confirmação genética do gene FMR1. Abaixo do limiar, indica-se acompanhamento clínico. O laudo é exportável imediatamente em PDF — um documento formal pronto para o prontuário ou para o encaminhamento. O sistema registra a triagem e, quando aplicável, o encaminhamento, no histórico do paciente."

---

### SLIDE 8 — O ECOSSISTEMA DO CUIDADO (≈ 40 seg) [SLIDE DE IMPACTO — FUNDO PRETO]

**Layout:**
- Fundo preto `#0D0D0D`, texto branco
- `assets/cito-tight.png` no canto inferior direito, `opacity: 7%`, altura 180px
- Três blocos simétricos em linha, Inter Regular, sem bordas (separados apenas por espaço):
  - **Prontuário** (ícone prancheta, traço fino branco 20px) · "Histórico completo de triagens, scores e encaminhamentos por paciente"
  - **Agenda** (ícone calendário) · "Gestão de consultas com status em tempo real e reagendamento contextual"
  - **Relatórios** (ícone gráfico) · "Exportação de avaliações para análise e auditoria clínica"
- Rodapé em Inter 12pt, `rgba(255,255,255,0.45)`: `"Interface mobile-first · tema claro e escuro · dados cifrados em repouso"`
- Fileira `cat-1.png` → `cat-4.png` no rodapé esquerdo, altura 20px, `opacity: 20%`

**Fala do apresentador:**
> "Além da triagem, o CITO oferece um prontuário consolidado por paciente, uma agenda clínica com gestão de status e reagendamento, e relatórios para análise agregada. A interface foi construída com prioridade ao uso móvel, com suporte a tema claro e escuro — porque o contexto de uso real é diverso, e a ferramenta precisa funcionar em qualquer tela, em qualquer turno."

---

### SLIDE 9 — CONFIABILIDADE E CONTEXTO INSTITUCIONAL (≈ 30 seg)

**Layout:**
- Fundo branco
- Quatro badges em linha horizontal, espaçados, cada um:
  - Borda 1px `#C0BDB8`, border-radius 8px, padding interno generoso
  - Ícone de traço fino acima
  - Rótulo principal em Inter Medium 14pt
  - Sublabel em Inter Regular 11pt, cinza médio
  - Badges: `CAAE 47291 · Aprovação ética` · `LGPD · Cifrado e mascarado` · `AUC 0,73–0,76 · Modelo validado` · `SUS · Uso clínico público`
- Abaixo dos badges, linha separadora fina e uma frase em Cormorant Garamond Italic 20pt, centralizada:
  `"O CITO não substitui o diagnóstico genético — é o elo entre o sintoma observável e o encaminhamento qualificado."`

**Fala do apresentador:**
> "A ferramenta opera dentro de um quadro rigoroso. O protocolo foi aprovado pelo comitê de ética sob CAAE 47291. Os dados pessoais são cifrados em repouso e mascarados na interface, em conformidade com a LGPD. O modelo de score foi validado com métricas de desempenho diagnóstico. E é fundamental dizer: o CITO não diagnostica — ele triagem. Seu papel é qualificar o encaminhamento para o teste genético confirmatório."

---

### SLIDE 10 — CONCLUSÃO: DA CITOSINA AO CUIDADO (≈ 40 seg)

**Layout:**
- Fundo branco `#FAFAF8`
- Centro do slide, uma única frase em Cormorant Garamond SemiBold 42pt, centralizada, com quebra de linha intencional:

  > "Da hipermetilação de uma citosina  
  > à triagem de um paciente —  
  > o CITO existe no espaço  
  > entre a biologia e o cuidado."

- Abaixo, separador fino `#E8E5E0` e em Inter Regular 13pt, cinza médio, centralizado:
  `"Sistema de Triagem para Síndrome do X Frágil · Artefato funcional · Projeto Acadêmico"`
- Canto inferior direito: `assets/cito-logo.png`, altura 40px, `opacity: 60%`
- Canto inferior esquerdo: `cat-4.png`, altura 36px, `opacity: 25%`

**Fala do apresentador:**
> "O CITO parte de um mecanismo molecular preciso — a hipermetilação de citosinas que silencia um gene, compromete sinapses e altera trajetórias de vida — e o transforma em uma ferramenta que um profissional de saúde pode usar em uma tarde de atendimento no SUS. Essa é a proposta: não simplificar a complexidade, mas torná-la acessível onde ela mais importa — na consulta, no prontuário, na decisão de encaminhar. Obrigado."

---

## NOTAS DE PRODUÇÃO PARA O CLAUDE DESIGN

- **Fontes:** Cormorant Garamond + Inter + JetBrains Mono — todas via Google Fonts, gratuitas
- **Assets:** usar exclusivamente os arquivos listados na tabela de assets acima; não inventar imagens
- **Silhuetas felinas:** no máximo 3 slides, sempre em escala reduzida ou baixa opacidade
- **Slides de fundo preto:** apenas slides 3 e 8 — não usar fundo escuro em outros
- **Diagrama biológico (Slide 3):** sóbrio, linhas finas brancas, rótulos textuais, sem cores
- **Barra de score (Slide 7):** horizontal, 0 à esquerda e 1 à direita, marcador vertical fino na posição do limiar
- **Timing total estimado:** 8–10 minutos de apresentação oral
- **Tom geral:** acadêmico, não-comercial — sem palavras como "clientes", "mercado", "vantagem competitiva"
