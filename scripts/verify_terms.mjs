// verify_terms.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Guarda de NOMENCLATURA (devolutiva de 18/09/2026). Os três termos padronizados:
//   • "DFS-Greedy (variante adotada)"  — nunca "Greedy DFS", "DFS (Greedy)", "DFS puro"
//   • "nós expandidos"                 — nunca "nós visitados"
//   • "16 ms/quadro (60 fps)"          — "16,67" só na linha que explica a conta (1000 ÷ 60)
//
// Varre artigo, roteiros, builder dos slides, gráficos, README e a interface do
// simulador. Sai com código 1 se achar um termo fora do padrão.
//
// Exceções deliberadas:
//   • a tabela "Diga / Nunca diga" dos roteiros (linhas que começam com "| **");
//   • identificadores de código (nodesVisited) — a coluna do CSV não muda de nome.
//
// Uso: node scripts/verify_terms.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative }              from 'node:path';
import { fileURLToPath }                                 from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const walk = (dir, ext, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, ext, out);
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
};

const FILES = [
  'tcc.md',
  'README.md',
  'apresentacao/ROTEIRO_DE_APRESENTACAO.md',
  'apresentacao/ROTEIRO_DE_ESTUDO.md',
  'apresentacao/tools/build_from_template.ps1',
  'apresentacao/tools/slide_charts.html',
  'apresentacao/tools/chart.html',
  'apresentacao/tools/build_deck_data.mjs',
].map(f => resolve(ROOT, f)).filter(existsSync).concat(walk(resolve(ROOT, 'src'), '.ts'));

const RULES = [
  { re: /Greedy[\s-]DFS/i,        msg: 'use "DFS-Greedy"' },
  { re: /DFS\s*\(Greedy\)/i,      msg: 'use "DFS-Greedy"' },
  { re: /DFS Greedy/i,            msg: 'use "DFS-Greedy" (com hífen)' },
  { re: /DFS puro/i,              msg: 'use "DFS canônico"' },
  { re: /n[oó]s\s+visitados/i,    msg: 'use "nós expandidos"' },
  { re: /16[,.]67/,               msg: '"16,67" só na linha que explica a conta (1000 ÷ 60); no resto, "16 ms/quadro (60 fps)"',
    allow: (line) => /1000/.test(line) },
];

let fails = 0, scanned = 0;
for (const file of FILES) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const isGuide = /ROTEIRO_/.test(rel);
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  scanned++;
  lines.forEach((line, i) => {
    if (isGuide && /^\|\s*\*\*/.test(line)) return;           // tabela "Diga / Nunca diga"
    if (/termos fora do padrão|nunca "|— nunca /i.test(line) && /verify_terms|build_from_template|build_deck_data/.test(rel)) return; // comentários que citam os termos proibidos
    for (const r of RULES) {
      if (!r.re.test(line)) continue;
      if (r.allow && r.allow(line)) continue;
      console.log(`  ✗ ${rel}:${i + 1}  ${r.msg}\n      ${line.trim().slice(0, 140)}`);
      fails++;
    }
  });
}

console.log(`\n=== verify_terms: ${scanned} arquivos · ${fails} termo(s) fora do padrão ===`);
process.exit(fails ? 1 : 0);
