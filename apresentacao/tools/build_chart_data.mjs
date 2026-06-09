// build_chart_data.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Gera chart_data.js a partir do CSV canônico (benchmark_results.csv).
// FONTE ÚNICA: nenhum número fica hardcoded em chart.html — tudo deriva do CSV.
// Se uma linha esperada faltar no CSV, o script FALHA (não emite dado errado).
//
// Mapa gráfico → tabela do TCC:
//   chartA  nós visitados, grade 20×20, densidades 0,2 e 0,4   (Tab. 1 e 2)
//   chartB  tempo médio × NPCs, congestionamento 30×30 d0,2    (Tab. 4)
//   chartC  tempo médio 50 NPCs, congestionamento 30×30 d0,2   (Tab. 4)
//   chartD  tempo total 50 NPCs, escalabilidade 20×20 d0,2      (Tab. 3)
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname }            from 'node:path';
import { fileURLToPath }               from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV = resolve(__dirname, '../../benchmark_results.csv');
const OUT = resolve(__dirname, 'chart_data.js');

const ALGOS = ['A*', 'Dijkstra', 'BFS', 'DFS', 'JPS'];

const text = readFileSync(CSV, 'utf8').trim();
const [head, ...lines] = text.split(/\r?\n/);
const col = Object.fromEntries(head.split(',').map((c, i) => [c, i]));
const rows = lines.filter(Boolean).map(l => {
  const c = l.split(',');
  return {
    testName:  c[col.testName],
    algorithm: c[col.algorithm],
    gridSize:  c[col.gridSize],
    density:   +c[col.obstacleDensity],
    npc:       +c[col.npcCount],
    nodes:     +c[col.nodesVisited],
    timeMs:    +c[col.timeMs],
    success:   c[col.success] === 'true',
  };
});

/** Retorna a única linha que satisfaz pred — falha se houver 0 ou >1. */
function one(pred, desc) {
  const m = rows.filter(pred);
  if (m.length !== 1) throw new Error(`FALHA: esperava 1 linha para "${desc}", encontrei ${m.length}`);
  return m[0];
}
/** Valor de `metric` para cada algoritmo (ordem ALGOS) no cenário `pred`. */
function series(metric, pred, desc) {
  return ALGOS.map(a => one(r => r.algorithm === a && pred(r), `${desc} [${a}]`)[metric]);
}

const isDens = (r) => r.testName === 'Densidades de Obstáculos' && r.gridSize === '20x20' && r.npc === 1;
const isCong = (r) => r.testName === 'Congestionamento' && r.gridSize === '30x30' && r.density === 0.2;
const isEsc  = (r) => r.testName === 'Escalabilidade (NPCs)' && r.gridSize === '20x20' && r.density === 0.2;

const data = {
  chartA: {
    algos: ALGOS,
    d02: series('nodes', r => isDens(r) && r.density === 0.2, 'chartA dens 0,2'),
    d04: series('nodes', r => isDens(r) && r.density === 0.4, 'chartA dens 0,4'),
  },
  chartB: {
    algos: ALGOS,
    npcs: [5, 10, 20, 50],
    series: Object.fromEntries(ALGOS.map(a => [a,
      [5, 10, 20, 50].map(n => one(r => r.algorithm === a && isCong(r) && r.npc === n, `chartB ${a} ${n}NPC`).timeMs),
    ])),
  },
  chartC: {
    algos: ALGOS,
    values: series('timeMs', r => isCong(r) && r.npc === 50, 'chartC 50 NPCs'),
  },
  chartD: {
    algos: ALGOS,
    values: series('timeMs', r => isEsc(r) && r.npc === 50, 'chartD 50 NPCs'),
  },
  meta: { frameBudgetMs: 16, fps: 60, source: 'benchmark_results.csv' },
};

const banner = '// GERADO por build_chart_data.mjs a partir de benchmark_results.csv — NÃO editar à mão.\n';
writeFileSync(OUT, `${banner}window.CHART_DATA = ${JSON.stringify(data, null, 2)};\n`);

console.log('✓ chart_data.js gerado a partir de benchmark_results.csv\n');
console.log(JSON.stringify(data, null, 2));
