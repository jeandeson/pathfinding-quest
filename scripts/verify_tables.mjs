// verify_tables.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Guarda de consistência: compara TODAS as tabelas de resultados do tcc.md
// contra o CSV canônico (benchmark_results.csv). Sai com código 1 se divergir.
//
// Convenção numérica pt-BR nas tabelas LaTeX:
//   ponto  = separador de milhar  ("7.100"  -> 7100)
//   vírgula = separador decimal    ("14,41"  -> 14.41)
//
// Uso: node scripts/verify_tables.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname }         from 'node:path';
import { fileURLToPath }            from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CSV  = resolve(ROOT, 'benchmark_results.csv');
const TCC  = resolve(ROOT, 'tcc.md');

if (!existsSync(TCC)) {
  console.error(`⚠ tcc.md não encontrado em ${TCC} — guarda de tabelas ignorado.`);
  process.exit(0);
}

// ── CSV ──────────────────────────────────────────────────────────────────────
const csvText = readFileSync(CSV, 'utf8').trim();
const [head, ...csvLines] = csvText.split(/\r?\n/);
const col = Object.fromEntries(head.split(',').map((c, i) => [c, i]));
const csv = csvLines.filter(Boolean).map(l => {
  const c = l.split(',');
  return {
    testName: c[col.testName], algorithm: c[col.algorithm], gridSize: c[col.gridSize],
    density: +c[col.obstacleDensity], npc: +c[col.npcCount],
    pathLength: +c[col.pathLength], nodes: +c[col.nodesVisited],
    timeMs: +c[col.timeMs], success: c[col.success] === 'true',
  };
});
const findCsv = (pred, desc) => {
  const m = csv.filter(pred);
  if (m.length !== 1) throw new Error(`CSV: esperava 1 linha p/ ${desc}, achei ${m.length}`);
  return m[0];
};

// ── Limpeza de células LaTeX ───────────────────────────────────────────────────
const clean = (s) => s
  .replace(/\\textit\{([^}]*)\}/g, '$1')
  .replace(/\\textbf\{([^}]*)\}/g, '$1')
  .replace(/\\[a-zA-Z]+/g, '')
  .replace(/[{}]/g, '')
  .replace(/\$/g, '')
  .trim();
const toInt   = (s) => Number(clean(s).replace(/\./g, '').replace(/\s/g, '')); // ponto = milhar
const toFloat = (s) => Number(clean(s).replace(/\./g, '').replace(',', '.'));   // vírgula = decimal
const ALGOS = ['A*', 'Dijkstra', 'BFS', 'DFS', 'JPS'];

// ── Config por tabela (label → como ler linhas + filtro CSV) ───────────────────
const TABLES = {
  'tab:obstaculos_dens02': {
    cols: ['algo', 'pathLength', 'nodes', 'timeMs', 'ok'],
    csv: (row) => (r) => r.testName === 'Densidades de Obstáculos' && r.gridSize === '20x20' && r.density === 0.2 && r.npc === 1 && r.algorithm === row.algo,
  },
  'tab:densidade_alta': {
    cols: ['algo', 'pathLength', 'nodes', 'timeMs', 'ok'],
    csv: (row) => (r) => r.testName === 'Densidades de Obstáculos' && r.gridSize === '20x20' && r.density === 0.4 && r.npc === 1 && r.algorithm === row.algo,
  },
  'tab:npcs_50': {
    cols: ['algo', 'pathLength', 'nodes', 'timeMs', 'ok'],
    csv: (row) => (r) => r.testName === 'Escalabilidade (NPCs)' && r.gridSize === '20x20' && r.density === 0.2 && r.npc === 50 && r.algorithm === row.algo,
  },
  'tab:congestionamento_npcs': {
    cols: ['algo', 'npc', 'nodes', 'timeMs', 'ok'],
    csv: (row) => (r) => r.testName === 'Congestionamento' && r.gridSize === '30x30' && r.density === 0.2 && r.npc === row.npc && r.algorithm === row.algo,
  },
  'tab:congestionamento': {
    cols: ['algo', 'pathLength', 'nodes', 'timeMs', 'ok'],
    csv: (row) => (r) => r.testName === 'Congestionamento' && r.gridSize === '30x30' && r.density === 0.2 && r.npc === 1 && r.algorithm === row.algo,
  },
  'tab:objetivos_dinamicos': {
    cols: ['algo', 'etapa', 'destino', 'pathLength', 'nodes', 'timeMs'],
    csv: (row) => (r) => r.testName === `Objetivo Dinâmico — Etapa ${row.etapa}` && r.gridSize === '40x40' && r.density === 0.25 && r.npc === 1 && r.algorithm === row.algo,
  },
};

// ── Parse das tabelas do tcc.md ────────────────────────────────────────────────
const tcc = readFileSync(TCC, 'utf8');
const blocks = [...tcc.matchAll(/\\begin\{table\}([\s\S]*?)\\end\{table\}/g)].map(m => m[1]);

let pass = 0, fail = 0;
const seenLabels = new Set();

for (const block of blocks) {
  const label = (block.match(/\\label\{(tab:[^}]+)\}/) || [])[1];
  const cfg = label && TABLES[label];
  if (!cfg) continue;
  seenLabels.add(label);

  const body = (block.match(/\\begin\{tabular\}[^\n]*\n([\s\S]*?)\\end\{tabular\}/) || [])[1] || '';
  const rawRows = body.split('\\\\').map(r => r.trim()).filter(Boolean);

  for (const raw of rawRows) {
    const cells = raw.split('&').map(c => c.trim());
    const algo = clean(cells[0] || '');
    if (!ALGOS.includes(algo)) continue; // pula \hline, cabeçalho, \multicolumn

    // monta objeto da linha conforme cols
    const row = {};
    cfg.cols.forEach((name, i) => { row[name === 'algo' ? 'algo' : name] = cells[i]; });
    row.algo = algo;
    if (row.npc   !== undefined) row.npc   = toInt(row.npc);
    if (row.etapa !== undefined) row.etapa = toInt(row.etapa);

    let csvRow;
    try { csvRow = findCsv(cfg.csv(row), `${label}/${algo}${row.npc?'/'+row.npc+'NPC':''}${row.etapa?'/Etapa'+row.etapa:''}`); }
    catch (e) { console.log(`  ✗ ${label}/${algo}: ${e.message}`); fail++; continue; }

    const checks = [];
    if (row.pathLength !== undefined) checks.push(['Compr.', toInt(row.pathLength), csvRow.pathLength, 0]);
    if (row.nodes      !== undefined) checks.push(['Nós',    toInt(row.nodes),      csvRow.nodes,      0]);
    if (row.timeMs     !== undefined) checks.push(['Tempo',  toFloat(row.timeMs),   round2(csvRow.timeMs), 0.005]);

    for (const [field, tableVal, csvVal, tol] of checks) {
      const idStr = `${label}/${algo}${row.npc?'/'+row.npc+'NPC':''}${row.etapa?'/Et'+row.etapa:''}`;
      if (Number.isNaN(tableVal)) { console.log(`  ✗ ${idStr} ${field}: tabela ilegível ("${row[fieldKey(field)]}")`); fail++; }
      else if (Math.abs(tableVal - csvVal) > tol) { console.log(`  ✗ ${idStr} ${field}: tabela=${tableVal} ≠ CSV=${csvVal}`); fail++; }
      else pass++;
    }
  }
}

function round2(v) { return Math.round(v * 100) / 100; }
function fieldKey(field) { return { 'Compr.': 'pathLength', 'Nós': 'nodes', 'Tempo': 'timeMs' }[field]; }

// tabelas configuradas que não foram encontradas no documento
for (const label of Object.keys(TABLES)) {
  if (!seenLabels.has(label)) { console.log(`  ✗ tabela ${label} NÃO encontrada no tcc.md`); fail++; }
}

console.log(`\n=== verify_tables: ${pass} células OK · ${fail} divergências ===`);
process.exit(fail ? 1 : 0);
