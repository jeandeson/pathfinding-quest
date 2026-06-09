// Build TCC presentation .pptx using pptxgenjs.
// Style mirrors the unijorge template: dark purple background, purple→magenta
// title gradient, magenta accents. Embeds simulator screenshots + benchmark charts.

const path  = require('path');
const PptxGenJS = require('./pptxgen.cjs.js');

// ── Style tokens ─────────────────────────────────────────────────────────────
const C = {
  bgDark:    '1A1230',
  bgPanel:   '241845',
  titleA:    '413967',   // gradient start
  titleB:    'A50B6E',   // gradient end
  accent:    'CF0D72',   // magenta
  textHi:    'FFFFFF',
  textBody:  'D0C0E8',
  textMute:  '8A7CB0',
  highlight: 'FFE066',   // gold for key numbers
  tech:      '88AAFF',   // light blue for code/tech
  ok:        '5FD68A',   // green
  warn:      'FF8855',   // orange
  err:       'FF5577',   // red
};

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const ASSETS  = path.resolve(__dirname, '..', 'assets');
const CHARTS  = path.resolve(__dirname, '..', 'charts');

// ── Helpers ──────────────────────────────────────────────────────────────────

const pres = new PptxGenJS();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Jeandeson Souza Nascimento';
pres.title  = 'TCC — Pathfinding em Jogos 2D';
pres.subject = 'Apresentação de TCC — UNIJORGE';

function addBaseDeco(slide, opts = {}) {
  // dark background
  slide.background = { color: C.bgDark };

  // left vertical accent bar
  slide.addShape('rect', { x: 0, y: 0, w: 0.1, h: SLIDE_H, fill: { color: C.accent }, line: { type: 'none' } });

  // bottom-right page mark (small UNIJORGE-style chip)
  if (!opts.noFooter) {
    slide.addText('UNIJORGE  ·  TCC 2026', {
      x: SLIDE_W - 3.0, y: SLIDE_H - 0.35, w: 2.9, h: 0.3,
      fontSize: 9, color: C.textMute, fontFace: 'Calibri',
      align: 'right', valign: 'middle',
    });
  }
}

function addHeaderTitle(slide, title, kicker) {
  // top-left "kicker" tag (section name)
  if (kicker) {
    slide.addText(kicker.toUpperCase(), {
      x: 0.4, y: 0.35, w: 4, h: 0.35,
      fontSize: 11, color: C.accent, bold: true, fontFace: 'Calibri',
      charSpacing: 3,
    });
  }
  // title
  slide.addText(title, {
    x: 0.4, y: 0.7, w: SLIDE_W - 0.8, h: 0.7,
    fontSize: 30, color: C.textHi, bold: true, fontFace: 'Calibri',
  });
  // divider line
  slide.addShape('rect', { x: 0.4, y: 1.42, w: 1.5, h: 0.04, fill: { color: C.accent }, line: { type: 'none' } });
}

function addBullets(slide, items, opts = {}) {
  const x = opts.x ?? 0.5;
  const y = opts.y ?? 1.75;
  const w = opts.w ?? SLIDE_W - 1.0;
  const h = opts.h ?? SLIDE_H - 2.3;

  const textObjs = items.map(it => {
    if (typeof it === 'string') return { text: it, options: { bullet: { code: '25CF' }, color: C.textBody, fontSize: 16, paraSpaceAfter: 8 } };
    // it = { text, bold?, color?, indent?, sub? }
    return {
      text: it.text,
      options: {
        bullet: it.sub ? { code: '25E6' } : { code: '25CF' },
        color: it.color || (it.bold ? C.textHi : C.textBody),
        fontSize: it.size || (it.sub ? 14 : 16),
        bold: !!it.bold,
        indentLevel: it.sub ? 1 : 0,
        paraSpaceAfter: 6,
      },
    };
  });

  slide.addText(textObjs, {
    x, y, w, h,
    fontFace: 'Calibri',
    valign: 'top',
  });
}

// ── Slide builders ───────────────────────────────────────────────────────────

function slideCover() {
  const s = pres.addSlide();
  s.background = { color: C.bgDark };

  // huge gradient panel on left
  s.addShape('rect', { x: 0, y: 0, w: 6.5, h: SLIDE_H,
    fill: { type: 'solid', color: C.titleA }, line: { type: 'none' } });
  s.addShape('rect', { x: 0, y: 0, w: 0.25, h: SLIDE_H, fill: { color: C.accent }, line: { type: 'none' } });

  // brand tag
  s.addText('CENTRO UNIVERSITÁRIO JORGE AMADO  ·  UNIJORGE', {
    x: 0.6, y: 0.55, w: 5.8, h: 0.35,
    fontSize: 11, color: 'FFFFFF', bold: true, fontFace: 'Calibri', charSpacing: 3,
  });
  s.addText('CIÊNCIA DA COMPUTAÇÃO  ·  TCC 2026', {
    x: 0.6, y: 0.85, w: 5.8, h: 0.3,
    fontSize: 10, color: 'D8C8F0', fontFace: 'Calibri', charSpacing: 2,
  });

  // main title
  s.addText('Análise Comparativa de Algoritmos de Pathfinding para NPCs em Jogos 2D em Ambiente Web', {
    x: 0.6, y: 1.7, w: 5.8, h: 2.6,
    fontSize: 26, color: C.textHi, bold: true, fontFace: 'Calibri',
  });

  // subtitle / scope
  s.addText('A*  ·  Dijkstra  ·  BFS  ·  DFS  ·  Jump Point Search', {
    x: 0.6, y: 4.45, w: 5.8, h: 0.8,
    fontSize: 14, color: 'E0D0FA', italic: true, fontFace: 'Calibri',
  });

  // author block
  s.addText([
    { text: 'AUTOR\n', options: { fontSize: 9, color: C.accent, bold: true, charSpacing: 2 } },
    { text: 'Jeandeson Souza Nascimento\n', options: { fontSize: 15, color: C.textHi, bold: true } },
    { text: 'jeandeson.nascimento@bol.com.br\n\n', options: { fontSize: 11, color: 'D8C8F0' } },
    { text: 'ORIENTADOR\n', options: { fontSize: 9, color: C.accent, bold: true, charSpacing: 2 } },
    { text: 'Prof. Gilson Amorim Carvalho\n', options: { fontSize: 14, color: C.textHi, bold: true } },
  ], { x: 0.6, y: 5.5, w: 5.8, h: 1.8, fontFace: 'Calibri', valign: 'top' });

  // right column with simulator screenshot
  s.addImage({ path: path.join(ASSETS, 'crop_01_menu_inicial.png'),
    x: 7.0, y: 1.3, w: 6.0, h: 4.5,
  });
  s.addText('Simulador interativo  ·  pathfinding-quest-j95b.vercel.app', {
    x: 7.0, y: 5.85, w: 6.0, h: 0.35,
    fontSize: 11, color: C.tech, italic: true, fontFace: 'Calibri', align: 'center',
  });

  // date
  s.addText('Salvador — BA  ·  2026', {
    x: 7.0, y: 6.85, w: 6.0, h: 0.3,
    fontSize: 10, color: C.textMute, fontFace: 'Calibri', align: 'center',
  });
}

function slideAgenda() {
  const s = pres.addSlide();
  addBaseDeco(s);
  addHeaderTitle(s, 'Roteiro', 'Apresentação');

  const items = [
    { idx: '01', title: 'Introdução',         desc: 'Contexto, problema, justificativa e objetivos' },
    { idx: '02', title: 'Referencial Teórico', desc: 'Os 5 algoritmos analisados e suas variantes' },
    { idx: '03', title: 'Metodologia',         desc: 'Stack, simulador desenvolvido e protocolo' },
    { idx: '04', title: 'Resultados',          desc: 'Benchmarks de obstáculos, NPCs e congestionamento' },
    { idx: '05', title: 'Conclusão',           desc: 'Trade-offs e trabalhos futuros' },
  ];

  items.forEach((it, i) => {
    const y = 2.0 + i * 0.95;
    s.addShape('rect', { x: 0.6, y, w: 0.85, h: 0.75, fill: { color: C.accent }, line: { type: 'none' } });
    s.addText(it.idx, { x: 0.6, y, w: 0.85, h: 0.75, fontSize: 28, bold: true, color: C.textHi, align: 'center', valign: 'middle', fontFace: 'Calibri' });
    s.addText(it.title, { x: 1.65, y: y + 0.05, w: 10, h: 0.4, fontSize: 20, bold: true, color: C.textHi, fontFace: 'Calibri' });
    s.addText(it.desc,  { x: 1.65, y: y + 0.42, w: 10, h: 0.35, fontSize: 13, color: C.textBody, fontFace: 'Calibri' });
  });
}

function sectionDivider(num, title) {
  const s = pres.addSlide();
  s.background = { color: C.titleA };
  // gradient-ish overlay via two rectangles
  s.addShape('rect', { x: 0, y: 0, w: SLIDE_W, h: SLIDE_H, fill: { type: 'solid', color: C.titleA }, line: { type: 'none' } });
  s.addShape('rect', { x: SLIDE_W * 0.55, y: 0, w: SLIDE_W * 0.45, h: SLIDE_H, fill: { type: 'solid', color: C.titleB }, line: { type: 'none' } });
  s.addShape('rect', { x: 0, y: SLIDE_H / 2 - 0.1, w: 1.5, h: 0.15, fill: { color: C.accent }, line: { type: 'none' } });

  s.addText(num, {
    x: 1.0, y: 2.0, w: 4, h: 1.5,
    fontSize: 90, color: 'FFFFFF', bold: true, fontFace: 'Calibri',
  });
  s.addText('SEÇÃO', {
    x: 1.0, y: 3.4, w: 4, h: 0.4,
    fontSize: 11, color: C.highlight, bold: true, fontFace: 'Calibri', charSpacing: 4,
  });
  s.addText(title, {
    x: 1.0, y: 3.85, w: 11, h: 1.5,
    fontSize: 60, color: C.textHi, bold: true, fontFace: 'Calibri',
  });

  s.addText('UNIJORGE  ·  TCC — Jeandeson Souza Nascimento', {
    x: 1.0, y: SLIDE_H - 0.6, w: 11, h: 0.3,
    fontSize: 10, color: 'E0D0FA', fontFace: 'Calibri', charSpacing: 2,
  });
}

// ── Conteúdo: Introdução ─────────────────────────────────────────────────────

function slideContexto() {
  const s = pres.addSlide();
  addBaseDeco(s);
  addHeaderTitle(s, 'Contexto e Problema', 'Introdução');

  addBullets(s, [
    { text: 'Jogos digitais combinam regras formais e mundos fictícios (Juul, 2005)', bold: true },
    { text: 'Em jogos de exploração, movimento inteligente é essencial para UX (Moon et al., 2022)', sub: true },
    { text: 'Devs indie têm acesso facilitado a IA via Unity e Phaser.js', bold: true },
    { text: 'Porém, falta referência de desempenho de pathfinding no navegador (V8)', sub: true },
    { text: '' },
    { text: 'Pergunta de pesquisa', bold: true, color: C.highlight },
    { text: 'Qual algoritmo escolher para ambientes web e qual o custo real de execução?', sub: true, color: C.textHi },
  ], { w: 8.5 });

  // right side stat block
  s.addShape('roundRect', { x: 9.3, y: 1.85, w: 3.6, h: 5.0, fill: { color: C.bgPanel }, line: { color: C.accent, width: 1 }, rectRadius: 0.1 });
  s.addText('5', { x: 9.3, y: 2.0, w: 3.6, h: 1.0, fontSize: 72, bold: true, color: C.accent, align: 'center', fontFace: 'Calibri' });
  s.addText('algoritmos analisados', { x: 9.3, y: 3.0, w: 3.6, h: 0.4, fontSize: 12, color: C.textBody, align: 'center', fontFace: 'Calibri' });
  s.addText('JavaScript / TypeScript', { x: 9.3, y: 3.6, w: 3.6, h: 0.4, fontSize: 14, color: C.tech, align: 'center', bold: true, fontFace: 'Calibri' });
  s.addText('Canvas API  ·  HTML5', { x: 9.3, y: 4.0, w: 3.6, h: 0.35, fontSize: 11, color: C.textBody, align: 'center', fontFace: 'Calibri' });
  s.addText('Implementados do zero', { x: 9.3, y: 4.6, w: 3.6, h: 0.4, fontSize: 12, color: C.textHi, align: 'center', italic: true, fontFace: 'Calibri' });
  s.addText('sem dependências externas', { x: 9.3, y: 4.95, w: 3.6, h: 0.4, fontSize: 11, color: C.textMute, align: 'center', fontFace: 'Calibri' });
  s.addShape('rect', { x: 9.9, y: 5.5, w: 2.4, h: 0.04, fill: { color: C.accent }, line: { type: 'none' } });
  s.addText('Critério de tempo real', { x: 9.3, y: 5.6, w: 3.6, h: 0.35, fontSize: 10, color: C.textMute, align: 'center', fontFace: 'Calibri' });
  s.addText('16 ms', { x: 9.3, y: 5.95, w: 3.6, h: 0.6, fontSize: 32, bold: true, color: C.highlight, align: 'center', fontFace: 'Calibri' });
  s.addText('orçamento por quadro · 60 fps', { x: 9.3, y: 6.5, w: 3.6, h: 0.3, fontSize: 9, color: C.textMute, align: 'center', fontFace: 'Calibri' });
}

function slideJustificativa() {
  const s = pres.addSlide();
  addBaseDeco(s);
  addHeaderTitle(s, 'Justificativa', 'Introdução');

  addBullets(s, [
    { text: 'Literatura clássica reporta experimentos em C++ ou compilação nativa', bold: true },
    { text: 'JavaScript introduz variabilidade não documentada para pathfinding', sub: true },
    { text: 'JIT progressivo, pausas de garbage collection, mitigações Spectre (timer)', sub: true },
    { text: '' },
    { text: 'Lacuna identificada', bold: true, color: C.highlight },
    { text: 'A comparação A* vs JPS em ambiente JavaScript/Web é pouco documentada', sub: true, color: C.textHi },
    { text: '' },
    { text: 'Entrega adicional do trabalho', bold: true },
    { text: 'Artefato funcional hospedado online — banca executa sem instalar nada', sub: true, color: C.ok },
  ], { w: 8.5 });

  // URL card
  s.addShape('roundRect', { x: 9.3, y: 2.0, w: 3.6, h: 4.5, fill: { color: C.bgPanel }, line: { color: C.tech, width: 1 }, rectRadius: 0.1 });
  s.addText('SIMULADOR ONLINE', { x: 9.3, y: 2.15, w: 3.6, h: 0.3, fontSize: 10, color: C.tech, bold: true, align: 'center', charSpacing: 3, fontFace: 'Calibri' });
  s.addText('pathfinding-quest-j95b\n.vercel.app', { x: 9.3, y: 2.5, w: 3.6, h: 1.0, fontSize: 14, color: C.textHi, bold: true, align: 'center', fontFace: 'Consolas' });
  s.addShape('rect', { x: 9.9, y: 3.65, w: 2.4, h: 0.03, fill: { color: C.tech }, line: { type: 'none' } });
  s.addText('REPOSITÓRIO', { x: 9.3, y: 3.85, w: 3.6, h: 0.3, fontSize: 10, color: C.tech, bold: true, align: 'center', charSpacing: 3, fontFace: 'Calibri' });
  s.addText('github.com/jeandeson\n/pathfinding-quest', { x: 9.3, y: 4.2, w: 3.6, h: 1.0, fontSize: 12, color: C.textBody, align: 'center', fontFace: 'Consolas' });
  s.addText('Demonstração ao vivo durante a defesa', { x: 9.3, y: 5.6, w: 3.6, h: 0.7, fontSize: 11, color: C.highlight, italic: true, align: 'center', fontFace: 'Calibri' });
}

function slideObjetivos() {
  const s = pres.addSlide();
  addBaseDeco(s);
  addHeaderTitle(s, 'Objetivos', 'Introdução');

  // OBJETIVO GERAL
  s.addShape('roundRect', { x: 0.5, y: 1.85, w: 12.3, h: 1.2, fill: { color: C.bgPanel }, line: { color: C.accent, width: 1 }, rectRadius: 0.08 });
  s.addText('OBJETIVO GERAL', { x: 0.75, y: 1.95, w: 11, h: 0.3, fontSize: 10, color: C.accent, bold: true, charSpacing: 3, fontFace: 'Calibri' });
  s.addText('Analisar comparativamente o desempenho de A*, Dijkstra, BFS, DFS e JPS em ambiente 2D com obstáculos, por meio do desenvolvimento de um simulador interativo funcional em JavaScript/TypeScript, avaliando métricas de eficiência computacional em ambiente web.',
    { x: 0.75, y: 2.25, w: 11.85, h: 0.85, fontSize: 13, color: C.textBody, fontFace: 'Calibri' });

  // OBJETIVOS ESPECÍFICOS (5 cards)
  const items = [
    { n: '1', t: 'Estudar', d: 'Princípios dos 5 algoritmos\nem grades 2D uniformes' },
    { n: '2', t: 'Implementar', d: 'Do zero, sem bibliotecas\ndependências externas' },
    { n: '3', t: 'Disponibilizar', d: 'Simulador interativo\nacessível por URL pública' },
    { n: '4', t: 'Avaliar', d: 'Métricas: tempo · nós\ncaminho · taxa de sucesso' },
    { n: '5', t: 'Validar', d: 'Admissibilidade da\nheurística de Manhattan' },
  ];
  items.forEach((it, i) => {
    const x = 0.5 + i * 2.5;
    s.addShape('roundRect', { x, y: 3.3, w: 2.35, h: 3.3, fill: { color: C.bgPanel }, line: { color: C.titleA, width: 1 }, rectRadius: 0.1 });
    s.addShape('rect', { x: x + 0.85, y: 3.5, w: 0.65, h: 0.65, fill: { color: C.accent }, line: { type: 'none' } });
    s.addText(it.n, { x: x + 0.85, y: 3.5, w: 0.65, h: 0.65, fontSize: 28, bold: true, color: C.textHi, align: 'center', valign: 'middle', fontFace: 'Calibri' });
    s.addText(it.t, { x, y: 4.4, w: 2.35, h: 0.5, fontSize: 17, bold: true, color: C.textHi, align: 'center', fontFace: 'Calibri' });
    s.addText(it.d, { x: x + 0.15, y: 5.0, w: 2.05, h: 1.5, fontSize: 11, color: C.textBody, align: 'center', fontFace: 'Calibri' });
  });
}

// ── Referencial Teórico ─────────────────────────────────────────────────────

function slideAlgoritmos() {
  const s = pres.addSlide();
  addBaseDeco(s);
  addHeaderTitle(s, 'Os 5 Algoritmos', 'Referencial Teórico');

  const rows = [
    [{ text: 'Algoritmo', options: { bold: true, fill: { color: C.titleA }, color: C.textHi, align: 'center', valign: 'middle' } },
     { text: 'Ótimo?',    options: { bold: true, fill: { color: C.titleA }, color: C.textHi, align: 'center', valign: 'middle' } },
     { text: 'Heurística', options: { bold: true, fill: { color: C.titleA }, color: C.textHi, align: 'center', valign: 'middle' } },
     { text: 'Memória',    options: { bold: true, fill: { color: C.titleA }, color: C.textHi, align: 'center', valign: 'middle' } },
     { text: 'Característica principal', options: { bold: true, fill: { color: C.titleA }, color: C.textHi, align: 'center', valign: 'middle' } }],
    [{ text: 'Dijkstra', options: { bold: true, color: C.warn } }, 'Sim', 'Não', 'Alta', 'Base de toda busca informada · explora uniformemente'],
    [{ text: 'BFS',      options: { bold: true, color: C.ok }   }, 'Sim (passos)', 'Não', 'Alta', 'Fila FIFO · ótimo em grades não ponderadas'],
    [{ text: 'DFS (Greedy)', options: { bold: true, color: C.err } }, 'Não', 'Ordenação Manhattan', 'Baixa', 'Pilha LIFO · rápido mas caminhos subótimos'],
    [{ text: 'A*',       options: { bold: true, color: C.tech } }, 'Sim', 'Manhattan', 'Média', 'f(n) = g(n) + h(n) · marco da busca heurística'],
    [{ text: 'JPS',      options: { bold: true, color: C.accent } }, 'Sim', 'Manhattan + poda', 'Baixa', 'Pula simetrias em corredores · ótima em grades densas'],
  ];

  s.addTable(rows, {
    x: 0.5, y: 1.85, w: 12.3, h: 4.2,
    fontSize: 14, fontFace: 'Calibri',
    color: C.textBody,
    border: { type: 'solid', pt: 0.5, color: C.titleA },
    colW: [1.8, 1.6, 2.4, 1.5, 5.0],
    rowH: 0.6,
    valign: 'middle',
  });

  s.addText('A escolha do algoritmo impacta diretamente o desempenho em cenários específicos (Salem et al., 2024)', {
    x: 0.5, y: 6.35, w: 12.3, h: 0.4,
    fontSize: 12, color: C.textMute, italic: true, align: 'center', fontFace: 'Calibri',
  });
}

function slideAStarJPS() {
  const s = pres.addSlide();
  addBaseDeco(s);
  addHeaderTitle(s, 'A* e JPS — em foco', 'Referencial Teórico');

  // A* column
  s.addShape('roundRect', { x: 0.5, y: 1.85, w: 6.0, h: 5.0, fill: { color: C.bgPanel }, line: { color: C.tech, width: 1.5 }, rectRadius: 0.1 });
  s.addText('A* (A-Star) — Hart et al., 1968', { x: 0.75, y: 2.0, w: 5.5, h: 0.5, fontSize: 18, bold: true, color: C.tech, fontFace: 'Calibri' });
  s.addText('Conciliação entre Dijkstra e busca heurística informada. Marco essencial da área de pathfinding.',
    { x: 0.75, y: 2.55, w: 5.5, h: 0.9, fontSize: 12, color: C.textBody, italic: true, fontFace: 'Calibri' });
  s.addShape('rect', { x: 1.0, y: 3.7, w: 5.0, h: 1.1, fill: { color: C.bgDark }, line: { color: C.tech, width: 0.5 } });
  s.addText('f(n) = g(n) + h(n)', { x: 1.0, y: 3.75, w: 5.0, h: 0.5, fontSize: 22, bold: true, color: C.highlight, align: 'center', fontFace: 'Consolas' });
  s.addText('g(n) custo real · h(n) estimativa', { x: 1.0, y: 4.3, w: 5.0, h: 0.4, fontSize: 11, color: C.textMute, align: 'center', fontFace: 'Calibri' });

  addBullets(s, [
    { text: 'Equilíbrio entre velocidade e precisão', sub: true },
    { text: 'Heurística admissível ⇒ caminho ótimo', sub: true },
    { text: 'Distância de Manhattan para grades 4-direcionais', sub: true },
  ], { x: 0.85, y: 4.95, w: 5.55, h: 1.8 });

  // JPS column
  s.addShape('roundRect', { x: 6.8, y: 1.85, w: 6.05, h: 5.0, fill: { color: C.bgPanel }, line: { color: C.accent, width: 1.5 }, rectRadius: 0.1 });
  s.addText('JPS — Harabor & Grastien, 2011', { x: 7.05, y: 2.0, w: 5.55, h: 0.5, fontSize: 18, bold: true, color: C.accent, fontFace: 'Calibri' });
  s.addText('Otimização do A*: poda de simetrias e jump points eliminam vizinhos redundantes.',
    { x: 7.05, y: 2.55, w: 5.55, h: 0.9, fontSize: 12, color: C.textBody, italic: true, fontFace: 'Calibri' });
  s.addShape('rect', { x: 7.3, y: 3.7, w: 5.0, h: 1.1, fill: { color: C.bgDark }, line: { color: C.accent, width: 0.5 } });
  s.addText('−99% nós em densidade 0.4', { x: 7.3, y: 3.75, w: 5.0, h: 0.5, fontSize: 18, bold: true, color: C.highlight, align: 'center', fontFace: 'Calibri' });
  s.addText('3 nós (JPS) vs 399 nós (A*)', { x: 7.3, y: 4.3, w: 5.0, h: 0.4, fontSize: 11, color: C.textMute, align: 'center', fontFace: 'Calibri' });

  addBullets(s, [
    { text: 'Mantém completude e otimalidade de A*', sub: true },
    { text: 'Salta em linhas retas até jump points', sub: true },
    { text: 'Adaptado para movimento 4-direcional neste trabalho', sub: true },
  ], { x: 7.15, y: 4.95, w: 5.55, h: 1.8 });
}

// ── Metodologia ─────────────────────────────────────────────────────────────

function slideStack() {
  const s = pres.addSlide();
  addBaseDeco(s);
  addHeaderTitle(s, 'Stack e Ambiente de Testes', 'Metodologia');

  // Stack column
  s.addText('STACK TÉCNICA', { x: 0.5, y: 1.85, w: 6, h: 0.35, fontSize: 11, bold: true, color: C.accent, charSpacing: 3, fontFace: 'Calibri' });
  const stackItems = [
    { label: 'Linguagem',   value: 'TypeScript 5' },
    { label: 'Bundler',     value: 'Vite 7' },
    { label: 'Renderização', value: 'Canvas 2D nativa (HTML5)' },
    { label: 'Dependências', value: 'Zero bibliotecas de pathfinding' },
    { label: 'Deploy',      value: 'Vercel (Edge Network)' },
  ];
  stackItems.forEach((it, i) => {
    const y = 2.25 + i * 0.55;
    s.addText(it.label, { x: 0.5, y, w: 2, h: 0.4, fontSize: 11, color: C.textMute, fontFace: 'Calibri' });
    s.addText(it.value, { x: 2.5, y, w: 4.0, h: 0.4, fontSize: 13, color: C.tech, bold: true, fontFace: 'Consolas' });
  });

  // Hardware column
  s.addText('AMBIENTE DE BENCHMARK', { x: 7.0, y: 1.85, w: 6, h: 0.35, fontSize: 11, bold: true, color: C.accent, charSpacing: 3, fontFace: 'Calibri' });
  const hwItems = [
    { label: 'CPU',     value: 'Intel Core i5-10300H' },
    { label: 'RAM',     value: '16 GB' },
    { label: 'Storage', value: 'SSD NVMe' },
    { label: 'OS',      value: 'Windows 11 Pro' },
    { label: 'Browser', value: 'Chrome · V8 (headless)' },
  ];
  hwItems.forEach((it, i) => {
    const y = 2.25 + i * 0.55;
    s.addText(it.label, { x: 7.0, y, w: 2, h: 0.4, fontSize: 11, color: C.textMute, fontFace: 'Calibri' });
    s.addText(it.value, { x: 9.0, y, w: 4.0, h: 0.4, fontSize: 13, color: C.textHi, bold: true, fontFace: 'Calibri' });
  });

  // Protocolo box
  s.addShape('roundRect', { x: 0.5, y: 5.4, w: 12.3, h: 1.5, fill: { color: C.bgPanel }, line: { color: C.titleA, width: 1 }, rectRadius: 0.1 });
  s.addText('PROTOCOLO DE REPRODUTIBILIDADE', { x: 0.7, y: 5.5, w: 12, h: 0.3, fontSize: 10, bold: true, color: C.accent, charSpacing: 3, fontFace: 'Calibri' });
  s.addText([
    { text: 'Medição: ', options: { fontSize: 13, color: C.textMute, fontFace: 'Calibri' } },
    { text: 'performance.now() ', options: { fontSize: 13, color: C.tech, bold: true, fontFace: 'Consolas' } },
    { text: '·  medição em lote (supera o piso do relógio)  ·  ', options: { fontSize: 13, color: C.textBody, fontFace: 'Calibri' } },
    { text: '10 janelas ', options: { fontSize: 13, color: C.highlight, bold: true, fontFace: 'Calibri' } },
    { text: 'em Chrome headless  ·  ', options: { fontSize: 13, color: C.textBody, fontFace: 'Calibri' } },
    { text: 'PRNG mulberry32 ', options: { fontSize: 13, color: C.tech, bold: true, fontFace: 'Consolas' } },
    { text: 'com semente fixa para obstáculos', options: { fontSize: 13, color: C.textBody, fontFace: 'Calibri' } },
  ], { x: 0.7, y: 5.85, w: 12, h: 1.0, fontFace: 'Calibri', valign: 'top' });
}

function slideSimulador() {
  const s = pres.addSlide();
  addBaseDeco(s);
  addHeaderTitle(s, 'Simulador desenvolvido', 'Metodologia');

  // Big screenshot
  s.addImage({ path: path.join(ASSETS, 'crop_04_jogo_debug_pathfinding.png'),
    x: 0.5, y: 1.85, w: 8.0, h: 5.0,
  });

  // right info
  s.addShape('roundRect', { x: 8.8, y: 1.85, w: 4.1, h: 5.0, fill: { color: C.bgPanel }, line: { color: C.tech, width: 1 }, rectRadius: 0.1 });
  s.addText('DEMONSTRAÇÃO AO VIVO', { x: 9.0, y: 2.0, w: 3.7, h: 0.35, fontSize: 11, bold: true, color: C.highlight, charSpacing: 3, fontFace: 'Calibri' });
  s.addText('pathfinding-\nquest-j95b\n.vercel.app', { x: 9.0, y: 2.4, w: 3.7, h: 1.4, fontSize: 16, bold: true, color: C.tech, align: 'center', fontFace: 'Consolas' });

  s.addShape('rect', { x: 9.3, y: 4.0, w: 3.1, h: 0.03, fill: { color: C.tech }, line: { type: 'none' } });

  addBullets(s, [
    { text: 'Selecionar algoritmo dos NPCs', sub: true },
    { text: 'Clicar no mapa para mover', sub: true },
    { text: 'Tecla D para debug visual', sub: true },
    { text: 'Modo Benchmark com gráficos', sub: true },
  ], { x: 9.0, y: 4.15, w: 3.9, h: 2.6 });
}

function slideProtocolo() {
  const s = pres.addSlide();
  addBaseDeco(s);
  addHeaderTitle(s, 'Cenários de teste', 'Metodologia');

  const cards = [
    { t: 'Densidade de Obstáculos', d: 'Grade 20×20\nDensidades 0,1 — 0,4\n4 níveis testados', c: C.tech },
    { t: 'Múltiplos NPCs',          d: 'Grade 20×20, densidade 0,2\n1, 5, 10, 20 e 50 NPCs\nbuscas simultâneas',       c: C.ok },
    { t: 'Congestionamento',        d: 'Grade 30×30 · corredor\ncentral forçado\nestresse de gargalo',                 c: C.warn },
    { t: 'Objetivos Dinâmicos',     d: 'Grade 40×40, densidade 0,25\n3 etapas sequenciais\nreplanejamento',             c: C.accent },
  ];

  cards.forEach((it, i) => {
    const x = 0.5 + (i % 2) * 6.3;
    const y = 1.95 + Math.floor(i / 2) * 2.4;
    s.addShape('roundRect', { x, y, w: 6.0, h: 2.1, fill: { color: C.bgPanel }, line: { color: it.c, width: 1 }, rectRadius: 0.1 });
    s.addShape('rect', { x, y, w: 0.12, h: 2.1, fill: { color: it.c }, line: { type: 'none' } });
    s.addText(it.t, { x: x + 0.3, y: y + 0.15, w: 5.5, h: 0.5, fontSize: 18, bold: true, color: C.textHi, fontFace: 'Calibri' });
    s.addText(it.d, { x: x + 0.3, y: y + 0.7, w: 5.5, h: 1.3, fontSize: 12, color: C.textBody, fontFace: 'Calibri' });
  });
}

// ── Resultados ──────────────────────────────────────────────────────────────

function slideObstaculos() {
  const s = pres.addSlide();
  addBaseDeco(s);
  addHeaderTitle(s, 'Impacto da densidade de obstáculos', 'Resultados');

  // Left: HD chart (Chart.js, 3200×1800)
  s.addImage({ path: path.join(CHARTS, 'chart_A.png'),
    x: 0.4, y: 1.89, w: 8.4, h: 4.725,
  });

  // Right: key findings
  s.addShape('roundRect', { x: 9.1, y: 1.85, w: 3.85, h: 5.0, fill: { color: C.bgPanel }, line: { color: C.accent, width: 1 }, rectRadius: 0.1 });
  s.addText('DESTAQUES', { x: 9.3, y: 2.0, w: 3.5, h: 0.35, fontSize: 11, bold: true, color: C.accent, charSpacing: 3, fontFace: 'Calibri' });

  s.addText('20×20 · densidade 0,4', { x: 9.3, y: 2.4, w: 3.5, h: 0.3, fontSize: 11, color: C.textMute, fontFace: 'Calibri' });
  s.addText('A*: 399 nós', { x: 9.3, y: 2.75, w: 3.5, h: 0.4, fontSize: 14, color: C.textBody, fontFace: 'Calibri' });
  s.addText('JPS: 3 nós', { x: 9.3, y: 3.15, w: 3.5, h: 0.4, fontSize: 16, bold: true, color: C.accent, fontFace: 'Calibri' });
  s.addText('−99,2%', { x: 9.3, y: 3.55, w: 3.5, h: 0.5, fontSize: 28, bold: true, color: C.highlight, fontFace: 'Calibri' });
  s.addShape('rect', { x: 9.4, y: 4.2, w: 3.3, h: 0.02, fill: { color: C.titleA }, line: { type: 'none' } });

  s.addText('Tempo médio  ·  todos algoritmos', { x: 9.3, y: 4.3, w: 3.5, h: 0.3, fontSize: 11, color: C.textMute, fontFace: 'Calibri' });
  s.addText('< 1 ms por busca', { x: 9.3, y: 4.6, w: 3.5, h: 0.5, fontSize: 18, bold: true, color: C.ok, fontFace: 'Calibri' });
  s.addText('ordens de grandeza sob 16 ms/quadro', { x: 9.3, y: 5.1, w: 3.5, h: 0.3, fontSize: 11, color: C.textMute, italic: true, fontFace: 'Calibri' });

  s.addShape('rect', { x: 9.4, y: 5.6, w: 3.3, h: 0.02, fill: { color: C.titleA }, line: { type: 'none' } });

  s.addText('DFS (Greedy)', { x: 9.3, y: 5.7, w: 3.5, h: 0.3, fontSize: 11, color: C.textMute, fontFace: 'Calibri' });
  s.addText('Caminho 15% mais longo', { x: 9.3, y: 6.0, w: 3.5, h: 0.4, fontSize: 13, color: C.err, bold: true, fontFace: 'Calibri' });
  s.addText('45 vs 39 células', { x: 9.3, y: 6.4, w: 3.5, h: 0.3, fontSize: 10, color: C.textMute, fontFace: 'Calibri' });
}

function slideMultiNPCs() {
  const s = pres.addSlide();
  addBaseDeco(s);
  addHeaderTitle(s, 'Escalabilidade no corredor (30×30)', 'Resultados');

  s.addImage({ path: path.join(CHARTS, 'chart_B.png'),
    x: 0.4, y: 1.89, w: 8.4, h: 4.725,
  });

  // right panel — história do crescimento linear (mesmo cenário do gráfico: corredor 30×30)
  s.addShape('roundRect', { x: 9.1, y: 1.85, w: 3.85, h: 5.0, fill: { color: C.bgPanel }, line: { color: C.ok, width: 1 }, rectRadius: 0.1 });
  s.addText('CRESCIMENTO LINEAR', { x: 9.3, y: 2.0, w: 3.5, h: 0.35, fontSize: 11, bold: true, color: C.ok, charSpacing: 3, fontFace: 'Calibri' });
  s.addText('Corredor 30×30 · densidade 0,2 · 5 → 50 NPCs', { x: 9.3, y: 2.4, w: 3.5, h: 0.5, fontSize: 11, color: C.textMute, fontFace: 'Calibri' });

  addBullets(s, [
    { text: 'Custo total ∝ nº de NPCs', bold: true, color: C.textHi, size: 13 },
    { text: 'cada NPC executa uma busca independente (V8 single-thread)', sub: true, size: 11 },
    { text: 'Orçamento de 16 ms/quadro (60 fps)', bold: true, color: C.highlight, size: 13 },
    { text: 'todos os algoritmos ficam bem abaixo, mesmo com 50 NPCs', sub: true, size: 11 },
  ], { x: 9.25, y: 3.05, w: 3.55, h: 2.4 });

  s.addShape('rect', { x: 9.4, y: 5.5, w: 3.3, h: 0.02, fill: { color: C.titleA }, line: { type: 'none' } });
  s.addText('A 50 NPCs no corredor', { x: 9.3, y: 5.62, w: 3.5, h: 0.3, fontSize: 11, color: C.textMute, fontFace: 'Calibri' });
  s.addText('de 0,71 ms (DFS) a 2,05 ms (Dijkstra)\n— todos sob 16 ms/quadro', { x: 9.3, y: 5.92, w: 3.5, h: 0.8, fontSize: 12, color: C.ok, bold: true, fontFace: 'Calibri' });
}

function slideCongestion() {
  const s = pres.addSlide();
  addBaseDeco(s);
  addHeaderTitle(s, 'Congestionamento — corredor forçado', 'Resultados');

  s.addImage({ path: path.join(CHARTS, 'chart_C.png'),
    x: 0.4, y: 1.89, w: 8.4, h: 4.725,
  });

  // right insight panel
  s.addShape('roundRect', { x: 9.1, y: 1.85, w: 3.85, h: 5.0, fill: { color: C.bgPanel }, line: { color: C.warn, width: 1 }, rectRadius: 0.1 });
  s.addText('GARGALO 30×30', { x: 9.3, y: 2.0, w: 3.5, h: 0.35, fontSize: 11, bold: true, color: C.warn, charSpacing: 3, fontFace: 'Calibri' });

  s.addText('Tempo médio com 50 NPCs', { x: 9.3, y: 2.45, w: 3.5, h: 0.35, fontSize: 11, color: C.textMute, fontFace: 'Calibri' });
  s.addText('DFS:  0,71 ms', { x: 9.3, y: 2.85, w: 3.5, h: 0.4, fontSize: 14, color: C.accent, bold: true, fontFace: 'Consolas' });
  s.addText('A*:   1,28 ms', { x: 9.3, y: 3.25, w: 3.5, h: 0.4, fontSize: 14, color: C.tech, bold: true, fontFace: 'Consolas' });
  s.addText('Dijkstra: 2,05 ms', { x: 9.3, y: 3.65, w: 3.5, h: 0.4, fontSize: 13, color: C.warn, fontFace: 'Consolas' });

  s.addShape('rect', { x: 9.4, y: 4.2, w: 3.3, h: 0.02, fill: { color: C.titleA }, line: { type: 'none' } });

  s.addText('Conclusão prática', { x: 9.3, y: 4.3, w: 3.5, h: 0.35, fontSize: 11, color: C.highlight, bold: true, fontFace: 'Calibri' });
  s.addText('Mesmo com 50 NPCs no corredor, todos ficam bem abaixo de 16 ms; a diferença está nos nós expandidos', {
    x: 9.3, y: 4.65, w: 3.5, h: 2.0, fontSize: 12, color: C.textBody, italic: true, fontFace: 'Calibri',
  });
}

function slideAnalise() {
  const s = pres.addSlide();
  addBaseDeco(s);
  addHeaderTitle(s, 'Comparativo geral', 'Resultados');

  s.addImage({ path: path.join(CHARTS, 'chart_D.png'),
    x: 0.4, y: 1.89, w: 8.4, h: 4.725,
  });

  // right tradeoff matrix
  s.addShape('roundRect', { x: 9.1, y: 1.85, w: 3.85, h: 5.0, fill: { color: C.bgPanel }, line: { color: C.accent, width: 1 }, rectRadius: 0.1 });
  s.addText('TRADE-OFFS', { x: 9.3, y: 2.0, w: 3.5, h: 0.35, fontSize: 11, bold: true, color: C.accent, charSpacing: 3, fontFace: 'Calibri' });

  addBullets(s, [
    { text: 'JPS — vence em nós expandidos', bold: true, color: C.accent, size: 13 },
    { text: 'Redução >99% em densidade alta; vantagem de tempo só em grades densas', sub: true, size: 11 },
    { text: 'A* — melhor equilíbrio geral', bold: true, color: C.tech, size: 13 },
    { text: 'Robusto · referência da literatura', sub: true, size: 11 },
    { text: 'DFS Greedy — só quando velocidade ≫ qualidade', bold: true, color: C.err, size: 13 },
    { text: 'Caminhos subótimos · 15% mais longos', sub: true, size: 11 },
  ], { x: 9.25, y: 2.45, w: 3.6, h: 4.3 });
}

// ── Conclusão ───────────────────────────────────────────────────────────────

function slideConclusoes() {
  const s = pres.addSlide();
  addBaseDeco(s);
  addHeaderTitle(s, 'Conclusões principais', 'Conclusão');

  const items = [
    { icon: '✓', t: 'Orçamento de 16 ms/quadro (60 fps) atendido',     d: 'Busca isolada em centésimos de ms — a estimativa inicial de 50 ms era folgada. Com 50 NPCs (20×20), todos os algoritmos ficam < 2 ms, folgadamente dentro do quadro', c: C.ok },
    { icon: '✓', t: 'JPS confirma vantagem em nós expandidos', d: 'Redução de >99% nos nós em grades densas · em tempo, sua vantagem aparece em grades densas e iguala-se ao A* nas esparsas',                  c: C.accent },
    { icon: '✓', t: 'A* segue como referência geral',     d: 'Melhor equilíbrio entre garantia de ótimo, uso de memória e desempenho · admissibilidade da heurística de Manhattan validada',  c: C.tech },
    { icon: '✗', t: 'DFS puro inviável em tempo real',    d: 'Mesmo Greedy DFS produz caminhos 15% mais longos · usabilidade comprometida em jogos onde o caminho importa',                    c: C.err },
  ];

  items.forEach((it, i) => {
    const y = 1.95 + i * 1.25;
    s.addShape('roundRect', { x: 0.5, y, w: 12.3, h: 1.1, fill: { color: C.bgPanel }, line: { color: it.c, width: 1 }, rectRadius: 0.08 });
    s.addShape('rect', { x: 0.5, y, w: 0.1, h: 1.1, fill: { color: it.c }, line: { type: 'none' } });
    s.addText(it.icon, { x: 0.75, y, w: 0.7, h: 1.1, fontSize: 30, bold: true, color: it.c, align: 'center', valign: 'middle', fontFace: 'Calibri' });
    s.addText(it.t,    { x: 1.55, y: y + 0.1, w: 11.0, h: 0.45, fontSize: 17, bold: true, color: C.textHi, fontFace: 'Calibri' });
    s.addText(it.d,    { x: 1.55, y: y + 0.55, w: 11.0, h: 0.55, fontSize: 11.5, color: C.textBody, fontFace: 'Calibri' });
  });
}

function slideFutureWork() {
  const s = pres.addSlide();
  addBaseDeco(s);
  addHeaderTitle(s, 'Limitações e trabalhos futuros', 'Conclusão');

  // limits column
  s.addText('LIMITAÇÕES IDENTIFICADAS', { x: 0.5, y: 1.85, w: 6, h: 0.35, fontSize: 11, bold: true, color: C.err, charSpacing: 3, fontFace: 'Calibri' });
  addBullets(s, [
    { text: 'Sem detecção de conectividade prévia ', bold: true },
    { text: 'Buscas exaustivas quando o destino é inalcançável', sub: true, size: 11 },
    { text: 'Custo escala com o número de agentes', bold: true },
    { text: 'Linear; pode pesar em grades grandes ou replanejamento a cada quadro', sub: true, size: 11 },
    { text: 'Hardware único', bold: true },
    { text: 'Resultados não generalizáveis a outros ambientes', sub: true, size: 11 },
  ], { x: 0.5, y: 2.25, w: 6, h: 4.5 });

  // future column
  s.addText('DIREÇÕES FUTURAS', { x: 6.9, y: 1.85, w: 6, h: 0.35, fontSize: 11, bold: true, color: C.highlight, charSpacing: 3, fontFace: 'Calibri' });

  const futures = [
    { t: 'D* Lite',          d: 'Replanejamento incremental proporcional às células afetadas\nKoenig & Likhachev, 2002', c: C.accent },
    { t: 'HPA*',             d: 'Hierarchical Pathfinding para mapas grandes\ncom pré-cálculo entre regiões',         c: C.tech },
    { t: 'Amortização temporal', d: 'Replanejar N NPCs por frame em vez de todos\npara distribuir o custo',          c: C.ok },
  ];
  futures.forEach((f, i) => {
    const y = 2.3 + i * 1.5;
    s.addShape('rect', { x: 6.9, y, w: 0.06, h: 1.3, fill: { color: f.c }, line: { type: 'none' } });
    s.addText(f.t, { x: 7.1, y, w: 5.9, h: 0.4, fontSize: 17, bold: true, color: f.c, fontFace: 'Calibri' });
    s.addText(f.d, { x: 7.1, y: y + 0.45, w: 5.9, h: 0.85, fontSize: 12, color: C.textBody, fontFace: 'Calibri' });
  });
}

function slideObrigado() {
  const s = pres.addSlide();
  s.background = { color: C.titleA };
  // diagonal band
  s.addShape('rect', { x: 0, y: 0, w: SLIDE_W * 0.55, h: SLIDE_H, fill: { type: 'solid', color: C.titleA }, line: { type: 'none' } });
  s.addShape('rect', { x: SLIDE_W * 0.55, y: 0, w: SLIDE_W * 0.45, h: SLIDE_H, fill: { type: 'solid', color: C.titleB }, line: { type: 'none' } });
  s.addShape('rect', { x: 0, y: SLIDE_H / 2 - 0.1, w: 1.5, h: 0.15, fill: { color: C.accent }, line: { type: 'none' } });

  s.addText('Obrigado', {
    x: 0.8, y: 2.4, w: 11, h: 1.8,
    fontSize: 96, color: 'FFFFFF', bold: true, fontFace: 'Calibri',
  });
  s.addText('Perguntas?', {
    x: 0.8, y: 4.1, w: 11, h: 0.8,
    fontSize: 32, color: C.highlight, italic: true, fontFace: 'Calibri',
  });

  s.addText('Jeandeson Souza Nascimento  ·  jeandeson.nascimento@bol.com.br', {
    x: 0.8, y: 5.6, w: 11, h: 0.4,
    fontSize: 14, color: 'E0D0FA', fontFace: 'Calibri',
  });
  s.addText('Simulador: pathfinding-quest-j95b.vercel.app', {
    x: 0.8, y: 6.0, w: 11, h: 0.4,
    fontSize: 12, color: 'E0D0FA', fontFace: 'Consolas',
  });
  s.addText('Repositório: github.com/jeandeson/pathfinding-quest', {
    x: 0.8, y: 6.35, w: 11, h: 0.4,
    fontSize: 12, color: 'E0D0FA', fontFace: 'Consolas',
  });

  s.addText('UNIJORGE  ·  TCC 2026', {
    x: 0.8, y: SLIDE_H - 0.55, w: 11, h: 0.3,
    fontSize: 10, color: 'D8C8F0', fontFace: 'Calibri', charSpacing: 3,
  });
}

// ── Build it all ─────────────────────────────────────────────────────────────

slideCover();
slideAgenda();
sectionDivider('01', 'Introdução');
slideContexto();
slideJustificativa();
slideObjetivos();
sectionDivider('02', 'Referencial Teórico');
slideAlgoritmos();
slideAStarJPS();
sectionDivider('03', 'Metodologia');
slideStack();
slideSimulador();
slideProtocolo();
sectionDivider('04', 'Resultados');
slideObstaculos();
slideMultiNPCs();
slideCongestion();
slideAnalise();
sectionDivider('05', 'Conclusão');
slideConclusoes();
slideFutureWork();
slideObrigado();

const out = path.resolve(__dirname, '..', 'TCC_Apresentacao_Jeandeson.pptx');
pres.writeFile({ fileName: out }).then(p => console.log(`✓ wrote ${p}`)).catch(e => { console.error(e); process.exit(1); });
