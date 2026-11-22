// build_deck_data.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Gera deck_data.json a partir do CSV canônico (benchmark_results.csv).
// É a fonte de TODOS os números que aparecem nos slides: build_from_template.ps1
// lê este JSON — nenhum resultado fica digitado à mão no builder.
//
// Além de formatar (pt-BR: vírgula decimal, ponto de milhar; mesmo arredondamento
// das tabelas do artigo), o script CONFERE cada afirmação que os slides fazem
// ("todos abaixo de 2 ms", "JPS não é o mais rápido", ...). Se o CSV mudar e uma
// afirmação deixar de valer, o build falha em vez de publicar um slide errado.
//
// Uso: node build_deck_data.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname }            from 'node:path';
import { fileURLToPath }               from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV = resolve(__dirname, '../../benchmark_results.csv');
const OUT = resolve(__dirname, 'deck_data.json');

const FRAME_MS = 16, FPS = 60;

// Nome de exibição padronizado (devolutiva): "DFS-Greedy (variante adotada)".
const ALGOS = [
  { key: 'astar',    csv: 'A*',       label: 'A*' },
  { key: 'dijkstra', csv: 'Dijkstra', label: 'Dijkstra' },
  { key: 'bfs',      csv: 'BFS',      label: 'BFS' },
  { key: 'dfs',      csv: 'DFS',      label: 'DFS-Greedy' },
  { key: 'jps',      csv: 'JPS',      label: 'JPS' },
];

// Mesmo arredondamento de verify_tables.mjs / chart.html (Math.round em 2 casas).
const brfmt = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
const brint = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const text = readFileSync(CSV, 'utf8').trim();
const [head, ...lines] = text.split(/\r?\n/);
const col = Object.fromEntries(head.split(',').map((c, i) => [c, i]));
const rows = lines.filter(Boolean).map(l => {
  const c = l.split(',');
  return {
    testName: c[col.testName], algorithm: c[col.algorithm], gridSize: c[col.gridSize],
    density: +c[col.obstacleDensity], npc: +c[col.npcCount], pathLength: +c[col.pathLength],
    nodes: +c[col.nodesVisited], timeMs: +c[col.timeMs], std: +c[col.timeMsStd], success: c[col.success] === 'true',
  };
});

function one(pred, desc) {
  const m = rows.filter(pred);
  if (m.length !== 1) throw new Error(`FALHA: esperava 1 linha para "${desc}", encontrei ${m.length}`);
  return m[0];
}
const cell = (r) => ({
  path: r.pathLength, nodes: r.nodes, time: r.timeMs, ok: r.success,
  pathF: r.success ? String(r.pathLength) : 'sem caminho',
  nodesF: brint(r.nodes), timeF: brfmt(r.timeMs),
});
/** { astar: cell, dijkstra: cell, ... } para o cenário `pred`. */
const byAlgo = (pred, desc, algos = ALGOS) =>
  Object.fromEntries(algos.map(a => [a.key, cell(one(r => r.algorithm === a.csv && pred(r), `${desc} [${a.csv}]`))]));

const isDens = (g, d) => (r) => r.testName === 'Densidades de Obstáculos' && r.gridSize === g && r.density === d && r.npc === 1;
const isEsc  = (n)    => (r) => r.testName === 'Escalabilidade (NPCs)' && r.gridSize === '20x20' && r.density === 0.2 && r.npc === n;
const isCong = (n)    => (r) => r.testName === 'Congestionamento' && r.gridSize === '30x30' && r.density === 0.2 && r.npc === n;
const isDyn  = (e)    => (r) => r.testName === `Objetivo Dinâmico — Etapa ${e}` && r.gridSize === '40x40';

const D = {
  meta: { frameMs: FRAME_MS, fps: FPS, source: 'benchmark_results.csv', budgetF: `${FRAME_MS} ms/quadro (${FPS} fps)` },
  algos: ALGOS,
  dens20: { d02: byAlgo(isDens('20x20', 0.2), 'dens20 0,2'), d04: byAlgo(isDens('20x20', 0.4), 'dens20 0,4') },
  dens40: { d02: byAlgo(isDens('40x40', 0.2), 'dens40 0,2'), d04: byAlgo(isDens('40x40', 0.4), 'dens40 0,4') },
  esc50:  byAlgo(isEsc(50), 'esc 50 NPCs'),
  cong:   Object.fromEntries([1, 5, 10, 20, 50].map(n => [`n${n}`, byAlgo(isCong(n), `cong ${n} NPCs`)])),
  dyn:    Object.fromEntries(['astar', 'dijkstra', 'jps'].map(k => {
            const a = ALGOS.find(x => x.key === k);
            return [k, Object.fromEntries([1, 2, 3].map(e => [`e${e}`, cell(one(r => r.algorithm === a.csv && isDyn(e)(r), `dyn ${a.csv} etapa ${e}`))]))];
          })),
  // Destinos das 3 etapas (BenchmarkRunner.suiteDynamicGoals), na notação do artigo.
  dynGoals: { e1: '(39,39)', e2: '(20,20)', e3: '(5,35)' },
};

// ── Afirmações dos slides (conferidas contra o CSV) ───────────────────────────
const checks = [];
const claim = (ok, msg) => { checks.push({ ok: !!ok, msg }); };
const d02 = D.dens20.d02, d04 = D.dens20.d04, e50 = D.esc50, c50 = D.cong.n50, g04 = D.dens40.d04;
const OPT = ['astar', 'dijkstra', 'bfs', 'jps'];
const times = (o) => ALGOS.map(a => o[a.key].time);

claim(d04.jps.nodes < d04.astar.nodes && d02.jps.nodes < d02.astar.nodes, 'JPS expande menos nós que o A* (20×20, densidades 0,2 e 0,4)');
claim(OPT.every(k => d02[k].path === d02.astar.path) && OPT.every(k => d04[k].path === d04.astar.path), 'A*, Dijkstra, BFS e JPS: mesmo comprimento de caminho (20×20)');
claim(d02.dfs.path > d02.astar.path, 'DFS-Greedy: caminho mais longo que o ótimo (20×20, densidade 0,2)');
claim(times(e50).every(t => t < 2), '50 NPCs (20×20): todos os algoritmos abaixo de 2 ms');
claim(times(c50).every(t => t < FRAME_MS), '50 NPCs no corredor (30×30): todos abaixo de 16 ms');
claim(e50.dfs.time === Math.min(...times(e50)), '50 NPCs (20×20): DFS-Greedy é o mais rápido');
claim(e50.jps.time > e50.astar.time && e50.jps.nodes < e50.astar.nodes, '50 NPCs (20×20): JPS expande menos nós que o A*, mas é mais lento');
claim(g04.jps.time < g04.astar.time, '40×40, densidade 0,4: JPS mais rápido que o A*');
claim(e50.dfs.path > e50.astar.path, '50 NPCs (20×20): caminho do DFS-Greedy maior que o ótimo');
claim(!D.dyn.astar.e2.ok && !D.dyn.dijkstra.e2.ok && !D.dyn.jps.e2.ok, 'Objetivos dinâmicos: etapa 2 sem caminho para os três algoritmos');
const stdSingle = Math.max(...rows.filter(r => r.npc === 1).map(r => r.std));
const stdMulti  = Math.max(...rows.filter(r => r.npc > 1).map(r => r.std));
claim(stdSingle < 0.01 && stdMulti < 0.07, 'Desvio-padrão: < 0,01 ms (1 busca) e < 0,07 ms (multi-NPC)');

const failed = checks.filter(c => !c.ok);
checks.forEach(c => console.log(`${c.ok ? '✓' : '✗'} ${c.msg}`));
if (failed.length) { console.error(`\n✗ ${failed.length} afirmação(ões) dos slides NÃO batem com o CSV — build interrompido.`); process.exit(1); }

// ── Valores derivados, já formatados ──────────────────────────────────────────
const pct = (v, d = 0) => brfmt(v * 100, d);
const worst = (o) => ALGOS.map(a => ({ a, c: o[a.key] })).sort((x, y) => y.c.time - x.c.time)[0];
D.derived = {
  jpsCut04F:      pct((d04.astar.nodes - d04.jps.nodes) / d04.astar.nodes, 1),   // 99,2
  jpsCut04IntF:   String(Math.floor((d04.astar.nodes - d04.jps.nodes) / d04.astar.nodes * 100)), // 99
  jpsCut02F:      pct((d02.astar.nodes - d02.jps.nodes) / d02.astar.nodes),      // 36
  dfsExtraPathF:  pct((d02.dfs.path - d02.astar.path) / d02.astar.path),         // 15
  optPathF:       String(d02.astar.path),                                        // 39
  dfsPathF:       String(d02.dfs.path),                                          // 45
  astarCong50PctF: pct(c50.astar.time / FRAME_MS),                               // 8
  worstCong50:    { label: worst(c50).a.label, timeF: worst(c50).c.timeF, pctF: pct(worst(c50).c.time / FRAME_MS) },
  worstEsc50:     { label: worst(e50).a.label, timeF: worst(e50).c.timeF, pctF: pct(worst(e50).c.time / FRAME_MS) },
  projMsF:        String(Math.round(g04.astar.time * 50)),                       // 12 (50 NPCs × A* 40×40 d0,4)
  jpsSpeedup40F:  String(Math.round(g04.astar.time / g04.jps.time)),             // 4
  replansPerSecF: brint(50 * FPS),                                               // 3.000
  frameExactF:    brfmt(1000 / FPS),                                             // 16,67
  stdSingleF:     '0,01', stdMultiF: '0,07',
};

writeFileSync(OUT, JSON.stringify(D, null, 2) + '\n');
console.log(`\n✓ deck_data.json gerado (${checks.length} afirmações conferidas contra o CSV)`);
console.log(JSON.stringify(D.derived, null, 2));
