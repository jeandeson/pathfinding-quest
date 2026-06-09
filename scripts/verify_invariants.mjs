// verify_invariants.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Audita a CORRETUDE LÓGICA dos dados de benchmark (não compara com o documento).
// Garante que os resultados respeitam propriedades dos algoritmos:
//   INV1 otimalidade (A*/Dijkstra/BFS/JPS mesmo comprimento; DFS >= ótimo)
//   INV2 consistência de sucesso entre algoritmos no mesmo cenário
//   INV3 expansões: JPS <= A* <= Dijkstra; A* <= BFS  (1 NPC)
//   INV4 escalabilidade linear: nodes(N NPCs) == N × nodes(1 NPC), mesma densidade
//   INV5 comprimento constante por algoritmo ao escalar NPCs
//   INV6 nós expandidos <= células da grade (1 NPC)
//
// Uso: node scripts/verify_invariants.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] || resolve(ROOT, 'benchmark_results.csv');

const lines = readFileSync(file, 'utf8').trim().split(/\r?\n/);
const rows = lines.slice(1).filter(Boolean).map(l => {
  const c = l.split(',');
  return {
    testName: c[0], algorithm: c[1], gridSize: c[2],
    density: +c[3], npc: +c[4], pathLength: +c[5],
    nodes: +c[6], timeMs: +c[7], std: +c[8], success: c[9] === 'true',
  };
});

const OPT = ['A*', 'Dijkstra', 'BFS', 'JPS'];
let pass = 0, fail = 0, warn = 0;
const ok   = () => { pass++; };
const bad  = (m) => { fail++; console.log('  ✗ FALHA: ' + m); };
const note = (m) => { warn++; console.log('  ⚠ NOTA: ' + m); };

const groups = new Map();
for (const r of rows) {
  const k = `${r.testName}|${r.gridSize}|${r.density}|${r.npc}`;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}

console.log(`\n=== ${file.split(/[\\/]/).pop()} — ${rows.length} linhas, ${groups.size} cenários ===\n`);

console.log('INV 1 — Otimalidade');
for (const [k, g] of groups) {
  const opt = g.filter(r => OPT.includes(r.algorithm) && r.success);
  if (opt.length > 1) {
    const lens = [...new Set(opt.map(r => r.pathLength))];
    if (lens.length !== 1) bad(`${k}: comprimentos ótimos divergentes -> ${opt.map(r => r.algorithm + '=' + r.pathLength).join(', ')}`);
    else ok();
  }
  const dfs = g.find(r => r.algorithm === 'DFS' && r.success);
  if (dfs && opt.length) {
    if (dfs.pathLength < opt[0].pathLength) bad(`${k}: DFS (${dfs.pathLength}) < ótimo (${opt[0].pathLength})`);
    else ok();
  }
}

console.log('INV 2 — Consistência de sucesso');
for (const [k, g] of groups) {
  const succ = [...new Set(g.map(r => r.success))];
  if (succ.length !== 1) bad(`${k}: sucesso divergente -> ${g.map(r => r.algorithm + '=' + r.success).join(', ')}`);
  else ok();
}

console.log('INV 3 — Expansões: JPS <= A* <= Dijkstra; A* <= BFS (1 NPC)');
for (const [k, g] of groups) {
  const byAlg = Object.fromEntries(g.map(r => [r.algorithm, r]));
  const a = byAlg['A*'], d = byAlg['Dijkstra'], b = byAlg['BFS'], j = byAlg['JPS'];
  if (!(a && a.success) || g[0].npc !== 1) continue;
  if (j && j.success) { if (j.nodes > a.nodes) bad(`${k}: JPS (${j.nodes}) > A* (${a.nodes})`); else ok(); }
  if (d && d.success) { if (a.nodes > d.nodes) bad(`${k}: A* (${a.nodes}) > Dijkstra (${d.nodes})`); else ok(); }
  if (b && b.success) { if (a.nodes > b.nodes) note(`${k}: A* (${a.nodes}) > BFS (${b.nodes})`); else ok(); }
}

console.log('INV 4 — Escalabilidade linear (mesma densidade)');
for (const test of ['Escalabilidade (NPCs)', 'Congestionamento']) {
  const byKey = {};
  for (const r of rows.filter(r => r.testName === test)) ((byKey[`${r.algorithm}|${r.density}`] ??= {}))[r.npc] = r;
  for (const key of Object.keys(byKey)) {
    const base = byKey[key][1];
    if (!base) continue;
    for (const npc of [5, 10, 20, 50]) {
      const r = byKey[key][npc];
      if (!r) continue;
      if (r.nodes !== base.nodes * npc) bad(`${test}/${key}/${npc}NPC: nodes=${r.nodes}, esperado ${base.nodes * npc}`);
      else ok();
    }
  }
}

console.log('INV 5 — Comprimento constante ao escalar NPCs');
for (const test of ['Escalabilidade (NPCs)', 'Congestionamento']) {
  const byAlg = {};
  for (const r of rows.filter(r => r.testName === test && r.success)) (byAlg[r.algorithm] ??= new Set()).add(r.pathLength);
  for (const alg of Object.keys(byAlg))
    if (byAlg[alg].size > 1) bad(`${test}/${alg}: pathLength varia -> ${[...byAlg[alg]].join(',')}`); else ok();
}

console.log('INV 6 — Nós <= células da grade (1 NPC)');
for (const r of rows.filter(r => r.npc === 1 && r.success)) {
  const [c1, c2] = r.gridSize.split('x').map(Number);
  if (r.nodes > c1 * c2) bad(`${r.testName}/${r.algorithm}/${r.gridSize}: nodes=${r.nodes} > ${c1 * c2}`); else ok();
}

console.log(`\n=== ${pass} OK · ${warn} notas · ${fail} falhas ===`);
process.exit(fail ? 1 : 0);
